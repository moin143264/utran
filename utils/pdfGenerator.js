const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate competition report PDF
exports.generateCompetitionReport = async (competition, matches, type = 'summary') => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            // Generate a secure random filename
            const randomString = crypto.randomBytes(16).toString('hex');
            const timestamp = Date.now();
            const filename = `competition-report-${competition._id}-${timestamp}-${randomString}.pdf`;
            const filePath = path.join(__dirname, '..', 'uploads', filename);
            
            // Set expiry time (2 hours from now)
            const expiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

            // Create write stream with error handling
            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', (error) => {
                reject(error);
            });

            // Pipe PDF to file
            doc.pipe(writeStream);

            // Add content to PDF based on type
            doc.fontSize(25).text(`Competition ${type.charAt(0).toUpperCase() + type.slice(1)}`, { align: 'center' });
            doc.moveDown();

            // Competition Details (common for all reports)
            doc.fontSize(15).text('Competition Details');
            doc.fontSize(12)
                .text(`Name: ${competition.name}`)
                .text(`Sport: ${competition.sport}`)
                .text(`Venue: ${competition.venue}`)
                .text(`Start Date: ${new Date(competition.startDate).toLocaleDateString()}`)
                .text(`End Date: ${new Date(competition.endDate).toLocaleDateString()}`)
                .text(`Status: ${competition.status}`);
            doc.moveDown();

            switch (type) {
                case 'summary':
                    // Teams
                    doc.fontSize(15).text('Participating Teams');
                    competition.teams.forEach((team, index) => {
                        doc.fontSize(12).text(`${index + 1}. ${team.name}`);
                    });
                    doc.moveDown();

                    // Recent Matches
                    doc.fontSize(15).text('Recent Matches');
                    matches.slice(-5).forEach((match) => {
                        doc.fontSize(12)
                            .text(`Round ${match.round} - Match ${match.matchNumber}`)
                            .text(`${match.team1.team.name} vs ${match.team2.team.name}`)
                            .text(`Score: ${match.team1.score} - ${match.team2.score}`);
                        doc.moveDown();
                    });
                    break;

                case 'schedule':
                    // Upcoming Matches
                    doc.fontSize(15).text('Match Schedule');
                    matches.filter(m => m.status === 'scheduled').forEach((match) => {
                        doc.fontSize(12)
                            .text(`Round ${match.round} - Match ${match.matchNumber}`)
                            .text(`${match.team1.team.name} vs ${match.team2.team.name}`)
                            .text(`Date: ${new Date(match.startTime).toLocaleString()}`);
                        doc.moveDown();
                    });
                    break;

                case 'results':
                    // Completed Matches
                    doc.fontSize(15).text('Match Results');
                    matches.filter(m => m.status === 'completed').forEach((match) => {
                        doc.fontSize(12)
                            .text(`Round ${match.round} - Match ${match.matchNumber}`)
                            .text(`${match.team1.team.name} vs ${match.team2.team.name}`)
                            .text(`Score: ${match.team1.score} - ${match.team2.score}`)
                            .text(`Winner: ${match.winner ? match.winner.name : 'Draw'}`);
                        doc.moveDown();
                    });
                    break;

                case 'statistics':
                    // Team Statistics
                    doc.fontSize(15).text('Team Statistics');
                    const teamStats = competition.teams.map(team => {
                        const teamMatches = matches.filter(m => 
                            m.team1.team._id.toString() === team._id.toString() ||
                            m.team2.team._id.toString() === team._id.toString()
                        );
                        const wins = teamMatches.filter(m => m.winner?._id.toString() === team._id.toString()).length;
                        const total = teamMatches.length;
                        return {
                            name: team.name,
                            matches: total,
                            wins,
                            winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : 0
                        };
                    });

                    teamStats.sort((a, b) => b.winRate - a.winRate);
                    teamStats.forEach((stat, index) => {
                        doc.fontSize(12)
                            .text(`${index + 1}. ${stat.name}`)
                            .text(`   Matches: ${stat.matches}, Wins: ${stat.wins}, Win Rate: ${stat.winRate}%`);
                        doc.moveDown();
                    });
                    break;

                case 'bracket':
                    // Tournament Bracket
                    doc.fontSize(15).text('Tournament Bracket');
                    const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b);
                    rounds.forEach(round => {
                        doc.fontSize(14).text(`Round ${round}`);
                        const roundMatches = matches.filter(m => m.round === round);
                        roundMatches.forEach(match => {
                            doc.fontSize(12)
                                .text(`Match ${match.matchNumber}: ${match.team1.team.name} vs ${match.team2.team.name}`)
                                .text(match.status === 'completed' 
                                    ? `Result: ${match.team1.score} - ${match.team2.score}` 
                                    : `Scheduled: ${new Date(match.startTime).toLocaleString()}`);
                            doc.moveDown();
                        });
                        doc.moveDown();
                    });
                    break;

                default:
                    throw new Error('Invalid report type');
            }

            // Footer
            doc.fontSize(10)
                .text(
                    `Generated on ${new Date().toLocaleString()}`,
                    { align: 'center' }
                );

            // Finalize PDF
            doc.end();

            resolve({
                filename,
                path: filePath,
                expiryTime,
                downloadToken: randomString
            });
        } catch (error) {
            reject(error);
        }
    });
};

// Generate team statistics PDF
exports.generateTeamStats = async (team, matches) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument();
            const randomString = crypto.randomBytes(16).toString('hex');
            const timestamp = Date.now();
            const filename = `team-stats-${team._id}-${timestamp}-${randomString}.pdf`;
            const filePath = path.join(__dirname, '..', 'uploads', filename);
            
            // Set expiry time (2 hours from now)
            const expiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

            // Create write stream with error handling
            const writeStream = fs.createWriteStream(filePath);
            writeStream.on('error', (error) => {
                reject(error);
            });

            // Pipe PDF to file
            doc.pipe(writeStream);

            // Add content to PDF
            // Header
            doc.fontSize(25).text('Team Statistics', { align: 'center' });
            doc.moveDown();

            // Team Details
            doc.fontSize(15).text('Team Details');
            doc.fontSize(12)
                .text(`Name: ${team.name}`)
                .text(`Captain: ${team.captain.name}`)
                .text(`Total Matches: ${team.totalMatches}`)
                .text(`Win Percentage: ${team.winPercentage.toFixed(2)}%`)
                .text(`Wins: ${team.wins}`)
                .text(`Losses: ${team.losses}`)
                .text(`Draws: ${team.draws}`);
            doc.moveDown();

            // Players
            doc.fontSize(15).text('Team Players');
            team.players.forEach((player) => {
                doc.fontSize(12)
                    .text(`${player.user.name} - ${player.position || 'No position'}`)
                    .text(`Jersey Number: ${player.jerseyNumber || 'N/A'}`);
            });
            doc.moveDown();

            // Match History
            doc.fontSize(15).text('Match History');
            matches.forEach((match) => {
                const isTeam1 = match.team1.team._id.toString() === team._id.toString();
                const opponent = isTeam1 ? match.team2.team.name : match.team1.team.name;
                const score = isTeam1
                    ? `${match.team1.score} - ${match.team2.score}`
                    : `${match.team2.score} - ${match.team1.score}`;

                doc.fontSize(12)
                    .text(`vs ${opponent}`)
                    .text(`Score: ${score}`)
                    .text(`Result: ${match.winner?._id.toString() === team._id.toString() ? 'Won' : 'Lost'}`)
                    .text(`Date: ${new Date(match.startTime).toLocaleString()}`);
                doc.moveDown();
            });

            // Footer
            doc.fontSize(10)
                .text(
                    `Generated on ${new Date().toLocaleString()}`,
                    { align: 'center' }
                );

            // Finalize PDF
            doc.end();

            resolve({
                filename,
                path: filePath,
                expiryTime,
                downloadToken: randomString
            });
        } catch (error) {
            reject(error);
        }
    });
};