const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const { generateCompetitionReport, generateTeamStats } = require('../utils/pdfGenerator');
const fs = require('fs').promises;
const path = require('path');

// @desc    Generate competition report PDF
// @route   GET /api/pdf/competition/:id/:type
// @access  Private/Organizer
exports.generateCompetitionReport = async (req, res) => {
    try {
        console.log(`[PDF] Generating competition report for competition ID: ${req.params.id}, type: ${req.params.type}`);
        
        if (!req.params.id) {
            return res.status(400).json({ message: 'Competition ID is required' });
        }
        
        if (!req.params.type) {
            return res.status(400).json({ message: 'Report type is required' });
        }
        
        // Validate report type
        const validTypes = ['summary', 'schedule', 'results', 'statistics', 'bracket'];
        if (!validTypes.includes(req.params.type)) {
            return res.status(400).json({ 
                message: `Invalid report type. Must be one of: ${validTypes.join(', ')}` 
            });
        }
        
        try {
            const competition = await Competition.findById(req.params.id)
                .populate('teams', 'name')
                .populate('organizer', 'name email');

            if (!competition) {
                return res.status(404).json({ message: 'Competition not found' });
            }

            // Check if organizer exists before trying to access its properties
            if (!competition.organizer) {
                return res.status(500).json({ message: 'Competition data is incomplete: Organizer missing.' });
            }

            // Check authorization
            if (req.user && competition.organizer._id.toString() !== req.user.id && req.user.role !== 'admin') {
                return res.status(401).json({ message: 'Not authorized to generate this report' });
            }

            console.log(`[PDF] Fetching matches for competition: ${competition.name}`);
            const matches = await Match.find({ competition: competition._id })
                .populate('team1.team team2.team', 'name')
                .populate('winner', 'name')
                .sort('round matchNumber');

            console.log(`[PDF] Found ${matches.length} matches for competition`);
            console.log(`[PDF] Generating PDF report of type: ${req.params.type}`);
            
            const { filename, path: filePath, expiryTime, downloadToken } = await generateCompetitionReport(competition, matches, req.params.type);
            console.log(`[PDF] Report generated successfully: ${filename}`);

            // Store file metadata in memory (in production, use Redis or similar)
            global.pdfFiles = global.pdfFiles || new Map();
            global.pdfFiles.set(downloadToken, {
                filePath,
                filename,
                expiryTime,
                competitionId: competition._id,
                organizerId: competition.organizer._id
            });
            console.log(`[PDF] File metadata stored with token: ${downloadToken}`);

            // Schedule file deletion after expiry
            setTimeout(async () => {
                try {
                    await fs.unlink(filePath);
                    global.pdfFiles.delete(downloadToken);
                    console.log(`[PDF] Expired file deleted: ${filename}`);
                } catch (error) {
                    console.error('Error deleting expired PDF:', error);
                }
            }, expiryTime - Date.now());

            // Return download URL with token
            const downloadUrl = `/api/pdf/download/${downloadToken}`;
            console.log(`[PDF] Returning download URL: ${downloadUrl}`);
            
            return res.json({
                message: 'PDF generated successfully',
                downloadUrl,
                filename,
                expiryTime
            });
        } catch (dbError) {
            console.error('[PDF] Database error:', dbError);
            return res.status(500).json({
                message: 'Error fetching competition data',
                error: dbError.message,
                stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
            });
        }
    } catch (error) {
        console.error('[PDF] Unhandled error in generateCompetitionReport:', error);
        return res.status(500).json({ 
            message: 'An unexpected error occurred while generating the report',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Generate team statistics PDF
// @route   GET /api/pdf/team/:id
// @access  Private
// @desc    Download generated PDF
// @route   GET /api/pdf/download/:token
// @access  Private
exports.downloadPDF = async (req, res) => {
    try {
        const { token } = req.params;
        console.log(`[PDF] Download request received for token: ${token}`);
        
        if (!token) {
            return res.status(400).json({ message: 'Download token is required' });
        }
        
        // Check if PDF exists and is not expired
        const pdfData = global.pdfFiles?.get(token);
        if (!pdfData) {
            console.log(`[PDF] Token not found in memory: ${token}`);
            return res.status(404).json({ message: 'PDF not found or has expired' });
        }

        const { filePath, filename, expiryTime, organizerId } = pdfData;
        console.log(`[PDF] Token found. File: ${filename}, Path: ${filePath}`);

        // Check if file has expired
        if (Date.now() > expiryTime) {
            console.log(`[PDF] File has expired: ${filename}`);
            global.pdfFiles.delete(token);
            try {
                await fs.unlink(filePath);
                console.log(`[PDF] Expired file deleted: ${filename}`);
            } catch (error) {
                console.error('[PDF] Error deleting expired file:', error);
            }
            return res.status(404).json({ message: 'PDF has expired' });
        }

        // Check if file physically exists before attempting to send
        try {
            console.log(`[PDF] Checking if file exists: ${filePath}`);
            const fileStats = await fs.stat(filePath);
            console.log(`[PDF] File exists, size: ${fileStats.size} bytes`);
            
            // Additional check to ensure file is not empty
            if (fileStats.size === 0) {
                console.error(`[PDF] File exists but is empty: ${filePath}`);
                global.pdfFiles.delete(token);
                return res.status(500).json({ message: 'Generated PDF file is empty' });
            }
        } catch (fileAccessError) {
            console.error('[PDF] File not accessible:', fileAccessError);
            global.pdfFiles.delete(token); // Clean up stale token
            return res.status(404).json({ 
                message: 'Physical PDF file not found or inaccessible',
                details: fileAccessError.message 
            });
        }

        console.log(`[PDF] Sending file to client: ${filename}`);
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send file
        res.download(filePath, filename, async (err) => {
            if (err) {
                console.error('[PDF] Error during download:', err);
                if (!res.headersSent) {
                    return res.status(500).json({ 
                        message: 'Error downloading file',
                        details: err.message 
                    });
                }
            } else {
                console.log(`[PDF] File successfully sent to client: ${filename}`);
            }
            
            // Delete file and token after download
            try {
                console.log(`[PDF] Cleaning up after download: ${filePath}`);
                await fs.unlink(filePath);
                global.pdfFiles.delete(token);
                console.log(`[PDF] Cleanup complete`);
            } catch (error) {
                console.error('[PDF] Error cleaning up after download:', error);
            }
        });
    } catch (error) {
        console.error('[PDF] Unhandled error in downloadPDF:', error);
        return res.status(500).json({ 
            message: 'An unexpected error occurred during download',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.generateTeamPDF = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('captain', 'name')
            .populate('players.user', 'name');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Check authorization
        if (team.captain._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to generate this report' });
        }

        const matches = await Match.find({
            $or: [
                { 'team1.team': team._id },
                { 'team2.team': team._id }
            ]
        })
            .populate('team1.team team2.team', 'name')
            .populate('winner', 'name')
            .populate('competition', 'name')
            .sort('-startTime');

        const { filename, path } = await generateTeamStats(team, matches);

        res.download(path, filename, (err) => {
            if (err) {
                res.status(500).json({ message: 'Error downloading file' });
            }
            // Delete file after download
            require('fs').unlinkSync(path);
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
