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

            // Ensure the uploads directory exists
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
                console.log('Created uploads directory:', uploadsDir);
            }
            
            // Add content to PDF based on type
            doc.fontSize(25).text(`Competition ${type.charAt(0).toUpperCase() + type.slice(1)}`, { align: 'center' });
            doc.moveDown();

            // Competition Details (common for all reports)
            doc.fontSize(15).text('Competition Details');
            doc.fontSize(12)
                .text(`Name: ${competition.name || 'N/A'}`)
                .text(`Sport: ${competition.sport || 'N/A'}`)
                .text(`Venue: ${competition.venue || 'N/A'}`)
                .text(`Start Date: ${competition.startDate ? new Date(competition.startDate).toLocaleDateString() : 'N/A'}`)
                .text(`End Date: ${competition.endDate ? new Date(competition.endDate).toLocaleDateString() : 'N/A'}`)
                .text(`Status: ${competition.status || 'N/A'}`);
            doc.moveDown();

            switch (type) {
                case 'summary':
                    // Teams
                    doc.fontSize(15).text('Participating Teams');
                    if (Array.isArray(competition.teams) && competition.teams.length > 0) {
                        competition.teams.forEach((team, index) => {
                            doc.fontSize(12).text(`${index + 1}. ${team.name || 'Unknown Team'}`);
                        });
                    } else {
                        doc.fontSize(12).text('No teams registered yet');
                    }
                    doc.moveDown();

                    // Recent Matches
                    doc.fontSize(15).text('Recent Matches');
                    if (Array.isArray(matches) && matches.length > 0) {
                        matches.slice(-5).forEach((match) => {
                            const team1Name = match.team1?.team?.name || 'Team 1';
                            const team2Name = match.team2?.team?.name || 'Team 2';
                            const team1Score = match.team1?.score ?? 0;
                            const team2Score = match.team2?.score ?? 0;
                            
                            doc.fontSize(12)
                                .text(`Round ${match.round || 'N/A'} - Match ${match.matchNumber || 'N/A'}`)
                                .text(`${team1Name} vs ${team2Name}`)
                                .text(`Score: ${team1Score} - ${team2Score}`);
                            doc.moveDown();
                        });
                    } else {
                        doc.fontSize(12).text('No matches available');
                    }
                    break;

                case 'schedule':
                    // Upcoming Matches
                    doc.fontSize(15).text('Match Schedule');
                    const scheduledMatches = Array.isArray(matches) ? matches.filter(m => m.status === 'scheduled') : [];
                    
                    if (scheduledMatches.length > 0) {
                        scheduledMatches.forEach((match) => {
                            const team1Name = match.team1?.team?.name || 'Team 1';
                            const team2Name = match.team2?.team?.name || 'Team 2';
                            const startTime = match.startTime ? new Date(match.startTime).toLocaleString() : 'TBD';
                            
                            doc.fontSize(12)
                                .text(`Round ${match.round || 'N/A'} - Match ${match.matchNumber || 'N/A'}`)
                                .text(`${team1Name} vs ${team2Name}`)
                                .text(`Date: ${startTime}`);
                            doc.moveDown();
                        });
                    } else {
                        doc.fontSize(12).text('No scheduled matches available');
                    }
                    break;

                case 'results':
                    // Completed Matches
                    doc.fontSize(15).text('Match Results');
                    const completedMatches = Array.isArray(matches) ? matches.filter(m => m.status === 'completed') : [];
                    
                    if (completedMatches.length > 0) {
                        completedMatches.forEach((match) => {
                            const team1Name = match.team1?.team?.name || 'Team 1';
                            const team2Name = match.team2?.team?.name || 'Team 2';
                            const team1Score = match.team1?.score ?? 0;
                            const team2Score = match.team2?.score ?? 0;
                            const winnerName = match.winner?.name || 'Draw';
                            
                            doc.fontSize(12)
                                .text(`Round ${match.round || 'N/A'} - Match ${match.matchNumber || 'N/A'}`)
                                .text(`${team1Name} vs ${team2Name}`)
                                .text(`Score: ${team1Score} - ${team2Score}`)
                                .text(`Winner: ${winnerName}`);
                            doc.moveDown();
                        });
                    } else {
                        doc.fontSize(12).text('No completed matches available');
                    }
                    break;

                case 'statistics':
                    // Team Statistics
                    doc.fontSize(15).text('Team Statistics');
                    let teamStats = [];
                    
                    try {
                        if (Array.isArray(competition.teams) && competition.teams.length > 0 && Array.isArray(matches)) {
                            teamStats = competition.teams.map(team => {
                                // Safely access team ID with fallbacks
                                const teamId = team._id?.toString();
                                if (!teamId) return null;
                                
                                // Safely filter matches
                                const teamMatches = matches.filter(m => {
                                    const team1Id = m.team1?.team?._id?.toString();
                                    const team2Id = m.team2?.team?._id?.toString();
                                    return team1Id === teamId || team2Id === teamId;
                                });
                                
                                // Calculate wins safely
                                const wins = teamMatches.filter(m => {
                                    const winnerId = m.winner?._id?.toString();
                                    return winnerId === teamId;
                                }).length;
                                
                                const total = teamMatches.length;
                                return {
                                    name: team.name || 'Unknown Team',
                                    matches: total,
                                    wins,
                                    winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : 0
                                };
                            }).filter(Boolean); // Remove any null entries
                            
                            teamStats.sort((a, b) => b.winRate - a.winRate);
                        }
                    } catch (statsError) {
                        console.error('Error generating team statistics:', statsError);
                    }
                    
                    if (teamStats.length > 0) {
                        teamStats.forEach((stat, index) => {
                            doc.fontSize(12)
                                .text(`${index + 1}. ${stat.name}`)
                                .text(`   Matches: ${stat.matches}, Wins: ${stat.wins}, Win Rate: ${stat.winRate}%`);
                            doc.moveDown();
                        });
                    } else {
                        doc.fontSize(12).text('No team statistics available');
                    }
                    break;

                case 'bracket':
                    // Tournament Bracket
                    doc.fontSize(15).text('Tournament Bracket');
                    
                    try {
                        if (Array.isArray(matches) && matches.length > 0) {
                            // Get unique rounds with error handling
                            const rounds = [...new Set(matches.filter(m => m.round !== undefined).map(m => m.round))].sort((a, b) => a - b);
                            
                            if (rounds.length > 0) {
                                rounds.forEach(round => {
                                    doc.fontSize(14).text(`Round ${round}`);
                                    const roundMatches = matches.filter(m => m.round === round);
                                    
                                    roundMatches.forEach(match => {
                                        const team1Name = match.team1?.team?.name || 'Team 1';
                                        const team2Name = match.team2?.team?.name || 'Team 2';
                                        const team1Score = match.team1?.score ?? 0;
                                        const team2Score = match.team2?.score ?? 0;
                                        const startTime = match.startTime ? new Date(match.startTime).toLocaleString() : 'TBD';
                                        
                                        doc.fontSize(12)
                                            .text(`Match ${match.matchNumber || 'N/A'}: ${team1Name} vs ${team2Name}`)
                                            .text(match.status === 'completed' 
                                                ? `Result: ${team1Score} - ${team2Score}` 
                                                : `Scheduled: ${startTime}`);
                                        doc.moveDown();
                                    });
                                    doc.moveDown();
                                });
                            } else {
                                doc.fontSize(12).text('No rounds defined in tournament');
                            }
                        } else {
                            doc.fontSize(12).text('No matches available for bracket');
                        }
                    } catch (bracketError) {
                        console.error('Error generating tournament bracket:', bracketError);
                        doc.fontSize(12).text('Error generating bracket. Please contact support.');
                    }
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
