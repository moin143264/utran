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
        if (competition.organizer._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to generate this report' });
        }

        const matches = await Match.find({ competition: competition._id })
            .populate('team1.team team2.team', 'name')
            .populate('winner', 'name')
            .sort('round matchNumber');

        const { filename, path: filePath, expiryTime, downloadToken } = await generateCompetitionReport(competition, matches, req.params.type);

        // Store file metadata in memory (in production, use Redis or similar)
        global.pdfFiles = global.pdfFiles || new Map();
        global.pdfFiles.set(downloadToken, {
            filePath,
            filename,
            expiryTime,
            competitionId: competition._id,
            organizerId: competition.organizer._id
        });

        // Schedule file deletion after expiry
        setTimeout(async () => {
            try {
                await fs.unlink(filePath);
                global.pdfFiles.delete(downloadToken);
            } catch (error) {
                console.error('Error deleting expired PDF:', error);
            }
        }, expiryTime - Date.now());

        // Return download URL with token
        res.json({
            message: 'PDF generated successfully',
            downloadUrl: `/api/pdf/download/${downloadToken}`,
            filename,
            expiryTime
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        
        // Check if PDF exists and is not expired
        const pdfData = global.pdfFiles?.get(token);
        if (!pdfData) {
            return res.status(404).json({ message: 'PDF not found or has expired' });
        }

        const { filePath, filename, expiryTime, organizerId } = pdfData;

        // Check if file has expired
        if (Date.now() > expiryTime) {
            global.pdfFiles.delete(token);
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.error('Error deleting expired file:', error);
            }
            return res.status(404).json({ message: 'PDF has expired' });
        }

        // Authorization is now implicitly handled by the validity of the token
        // and the organizerId stored with it. If a specific user check is still needed,
        // it would have to be done differently without req.user from 'protect' middleware.
        // For now, we assume the token's existence and non-expiry is sufficient for download.

        // Check if file physically exists before attempting to send
        try {
            await fs.access(filePath);
        } catch (fileAccessError) {
            console.error('File not accessible at path:', filePath, fileAccessError);
            global.pdfFiles.delete(token); // Clean up stale token
            return res.status(404).json({ message: 'Physical PDF file not found or inaccessible.' });
        }

        // Send file
        res.download(filePath, filename, async (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                if (!res.headersSent) {
                    res.status(500).json({ message: 'Error downloading file' });
                }
            }
            // Delete file and token after download
            try {
                await fs.unlink(filePath);
                global.pdfFiles.delete(token);
            } catch (error) {
                console.error('Error cleaning up after download:', error);
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: error.message });
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