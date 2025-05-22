const Team = require('../models/Team');
const Competition = require('../models/Competition');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Create a new team
// @route   POST /api/teams
// @access  Private
exports.createTeam = async (req, res) => {
    try {
        console.log('============ CREATE TEAM CALLED ============');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Creating team with new schema structure');
        const { name, description, competitionId } = req.body;

        // Check if team with same name already exists
        const existingTeam = await Team.findOne({ name });
        if (existingTeam) {
            return res.status(400).json({ message: 'Team name already exists' });
        }

        // Get full captain details
        const captainDetails = await User.findById(req.user._id).select('-password');
        
        // Prepare the list of players
        let playersToCreate = [];

        // 1. Add the captain as a player
        const captainPlayer = {
            user: req.user._id,
            position: 'Captain',
            jerseyNumber: 1, // Or some default/configurable jersey number
            userDetails: {
                name: captainDetails.name,
                email: captainDetails.email,
                role: captainDetails.role,
                avatar: captainDetails.avatar || 'default-avatar.png'
            }
        };
        playersToCreate.push(captainPlayer);

        // 2. Process additional players from req.body.players, if any
        if (req.body.players && Array.isArray(req.body.players)) {
            for (const playerInput of req.body.players) {
                if (playerInput.user && playerInput.user.toString() !== req.user._id.toString()) { // Avoid duplicating captain
                    const userDetails = await User.findById(playerInput.user).select('-password');
                    if (userDetails) {
                        playersToCreate.push({
                            user: playerInput.user,
                            position: playerInput.position || 'Player',
                            jerseyNumber: parseInt(playerInput.jerseyNumber) || 0,
                            userDetails: {
                                name: userDetails.name,
                                email: userDetails.email,
                                role: userDetails.role,
                                avatar: userDetails.avatar || 'default-avatar.png'
                            }
                        });
                    } else {
                        console.warn(`User with ID ${playerInput.user} not found, skipping for team creation.`);
                    }
                }
            }
        }
        
        // Create team with the processed list of players
        const team = await Team.create({
            name,
            description,
            captain: req.user.id,
            players: playersToCreate,
            competitions: competitionId ? [competitionId] : []
        });

        // If competition ID is provided, validate and populate it
        if (competitionId) {
            const competition = await Competition.findById(competitionId);
            if (!competition) {
                await Team.findByIdAndDelete(team._id);
                return res.status(404).json({ message: 'Competition not found' });
            }
            
            // Check if competition has reached max teams
            if (competition.teams && competition.teams.length >= competition.maxTeams) {
                await Team.findByIdAndDelete(team._id);
                return res.status(400).json({ message: 'Competition has reached maximum number of teams' });
            }
            
            await team.populate('competitions');

            // Add team to competition
            competition.teams.push(team._id);
            await competition.save();
        }

        // Populate user details and competition details before sending response
        await team.populate('players.user', 'name email');
        await team.populate('competitions', 'name sport');

        // Emit event for real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit to main namespace
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('teamUpdate', {
                type: 'create',
                team: team,
                organizerId: req.user ? req.user._id : null
            });
            
            // Also emit to the specific user's room
            if (req.user && req.user._id) {
                mainNamespace.to(`user:${req.user._id}`).emit('teamUpdate', {
                    type: 'create',
                    team: team,
                    organizerId: req.user._id
                });
            }
            
            console.log('Emitted teamUpdate event (create) for team:', team._id);
        } else {
            console.warn('Socket.io instance not found. Cannot emit teamCreated event.');
        }

        res.status(201).json(team);
    } catch (error) {
        console.error('Error creating team:', error); 
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Team name already exists' });
        }
        res.status(500).json({ message: 'Server Error while creating team' }); 
    }
};

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
exports.getTeams = async (req, res) => {
    try {
        const { player } = req.query;
        const filter = {};

        if (player) {
            filter['players.user'] = player;
        }

        const teams = await Team.find(filter)
            .populate('captain', 'name email')
            .populate('players.user', 'name email')
            .populate('competitions', 'name sport');
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Public
exports.getTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('captain', 'name email')
            .populate('players.user', 'name email')
            .populate('competitions');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        res.json(team);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
exports.updateTeam = async (req, res) => {
    try {
        console.log('updateTeam received req.body:', JSON.stringify(req.body, null, 2)); // Log incoming request body
        let team = await Team.findById(req.params.id);

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Check if user is team captain or admin
        if (team.captain.toString() !== req.user.id.toString() && req.user.role !== 'admin') { // Use req.user.id
            return res.status(401).json({ message: 'Not authorized' });
        }

        const { name, description, players } = req.body;

        // Prepare update data
        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (players && Array.isArray(players)) {
            // Ensure players array contains valid data, e.g., user references
            // For simplicity, we assume the client sends the correct structure:
            // [{ user: 'userId1', position: 'pos1', jerseyNumber: 1 }, ...]
            updateData.players = players.map(p => ({
                user: p.user, // Should be the ObjectId string
                position: p.position,
                jerseyNumber: p.jerseyNumber
                // Any other fields stored directly in the players subdocument
            }));
        }
        // Note: Updating competition associations is not handled here, but could be added.

        console.log('updateTeam constructed updateData:', JSON.stringify(updateData, null, 2)); // Log data prepared for update

        team = await Team.findByIdAndUpdate(
            req.params.id,
            { $set: updateData }, // Use the constructed updateData
            { new: true, runValidators: true } // runValidators to ensure schema compliance
        )
        .populate('captain', 'name email')
        .populate('players.user', 'name email')
        .populate('competitions');

        // Emit event for real-time update
        const io = req.app.get('io');
        if (io) {
            // Emit to main namespace
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('teamUpdate', {
                type: 'update',
                team: team,
                organizerId: req.user ? req.user._id : null
            });
            
            // Also emit to the specific user's room
            if (req.user && req.user._id) {
                mainNamespace.to(`user:${req.user._id}`).emit('teamUpdate', {
                    type: 'update',
                    team: team,
                    organizerId: req.user._id
                });
            }
            
            console.log('Emitted teamUpdate event (update) for team:', team._id);
        } else {
            console.warn('Socket.io instance not found. Cannot emit teamUpdated event.');
        }

        res.json(team);
    } catch (error) {
        console.error('Error updating team:', error); // Add logging
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Team not found' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error while updating team' });
    }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private
exports.deleteTeam = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Log values for debugging authorization
        console.log('Attempting to delete team. Details for authorization check:');
        console.log('Team ID:', team._id);
        console.log('Team Captain ID:', team.captain);
        console.log('Requesting User ID:', req.user.id);
        console.log('Requesting User Role:', req.user.role);

        // Check if user is team captain or admin
        // Also ensure team.captain is populated before trying to access its properties
        if (!team.captain || team.captain.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized or team data incomplete' });
        }

        await Team.findByIdAndDelete(req.params.id); 

        res.json({ message: 'Team removed' });
    } catch (error) {
        console.error('Error deleting team:', error); 
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(500).json({ message: 'Failed to delete team. Server Error.' }); 
    }
};

// @desc    Add player to team
// @route   POST /api/teams/:id/players
// @access  Private
exports.addPlayer = async (req, res) => {
    try {
        console.log('Adding player to team');
        console.log('Request params:', req.params);
        console.log('Request body:', req.body);
        
        const { userId, position, jerseyNumber } = req.body;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Get teamId from params
        const teamId = req.params.id;
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Get the team
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        console.log(`Team ${team.name} has ${team.players?.length || 0} players before adding`);
        
        // Check authorization
        if (team.captain.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin' && req.user.role !== 'organizer') {
            return res.status(401).json({ message: 'Not authorized to add players to this team' });
        }
        
        // Check if user is already in team
        const isPlayerInTeam = team.players.some(player => 
            player.user.toString() === userId.toString()
        );

        if (isPlayerInTeam) {
            return res.status(400).json({ message: 'User is already a member of this team' });
        }
        
        // Create user details object
        const userDetails = {
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || 'default-avatar.png'
        };
        
        // Create new player object
        const newPlayer = {
            user: userId,
            position: position || '',
            jerseyNumber: jerseyNumber || 0,
            userDetails: userDetails
        };
        
        // DIRECT APPROACH: First get the team, then manually add player, then save
        // This is the most reliable way to ensure the player is added
        const teamToUpdate = await Team.findById(teamId);
        
        // Double-check player isn't already in team
        const playerExists = teamToUpdate.players.some(p => 
            p.user.toString() === userId.toString()
        );
        
        if (!playerExists) {
            // Add player to the array
            teamToUpdate.players.push(newPlayer);
            teamToUpdate.markModified('players'); // Explicitly mark 'players' as modified
            
            // Save the team
            await teamToUpdate.save();
            console.log('Team saved with player added. Current players in document:', JSON.stringify(teamToUpdate.players));
        } else {
            console.log('Player already exists in team (double-check)');
        }
        
        // Get the updated team with population
        const updatedTeam = await Team.findById(teamId)
            .populate('captain', 'name email')
            .populate('players.user', 'name email role')
            .populate('competitions');
        
        console.log(`Team now has ${updatedTeam.players?.length || 0} players after adding`);
        
        res.status(200).json(updatedTeam);
    } catch (error) {
        console.error('Error in addPlayer:', error);
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Team or User not found' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Remove player from team
// @route   DELETE /api/teams/:id/players/:playerId
// @access  Private
exports.removePlayer = async (req, res) => {
    try {
        console.log('Removing player from team');
        console.log('Team ID:', req.params.id);
        console.log('Player ID:', req.params.playerId);
        
        const team = await Team.findById(req.params.id);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Check authorization
        if (team.captain.toString() !== req.user._id.toString() && 
            req.user.role !== 'admin' && req.user.role !== 'organizer') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Check if player is in team
        const playerExists = team.players.some(player => 
            player.user.toString() === req.params.playerId
        );

        if (!playerExists) {
            return res.status(404).json({ message: 'Player not found in team' });
        }

        // Remove player using $pull operator
        await Team.findByIdAndUpdate(
            req.params.id,
            { $pull: { players: { user: req.params.playerId } } },
            { new: true }
        );
        
        // Get updated team
        const updatedTeam = await Team.findById(req.params.id)
            .populate('captain', 'name email')
            .populate('players.user', 'name email role')
            .populate('competitions');

        res.json(updatedTeam);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Team not found' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
};
