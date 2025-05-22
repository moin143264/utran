const Competition = require('../models/Competition');
const { validationResult } = require('express-validator');

// @desc    Create new competition
// @route   POST /api/competitions
// @access  Private/Organizer
exports.createCompetition = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        console.log('Competition create request body:', req.body);
        
        // Extract all fields from request body
        const { 
            name, sport, venue, startDate, endDate, 
            description, maxTeams, registrationDeadline,
            rules, prizes, status = 'upcoming'
        } = req.body;
        
        const competitionData = {
            name,
            sport,
            venue,
            startDate,
            endDate,
            description,
            maxTeams,
            registrationDeadline,
            organizer: req.user._id,
            status
        };
        
        // Add optional fields if they exist
        if (rules) competitionData.rules = rules;
        if (prizes) competitionData.prizes = prizes;
        
        console.log('Creating competition with data:', competitionData);
        const competition = await Competition.create(competitionData);

        // Emit socket event for new competition
        const io = req.app.get('io');
        const mainNamespace = io.of('/main');
        
        // Emit to everyone
        mainNamespace.emit('competitionUpdate', {
            type: 'create',
            organizerId: req.user._id,
            competition
        });
        
        // Also emit to the specific user's room
        mainNamespace.to(`user:${req.user._id}`).emit('competitionUpdate', {
            type: 'create',
            organizerId: req.user._id,
            competition
        });
        
        console.log(`Socket: Emitted competitionUpdate to user:${req.user._id}`, {
            type: 'create',
            organizerId: req.user._id,
            competitionId: competition._id
        });

        res.status(201).json(competition);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all competitions
// @route   GET /api/competitions
// @access  Public
exports.getCompetitions = async (req, res) => {
    try {
        const { status, sport, teams } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (sport) filter.sport = sport;
        if (teams) {
            const teamIds = teams.split(',');
            filter.teams = { $in: teamIds };
        }

        const competitions = await Competition.find(filter)
            .populate('organizer', 'name email')
            .populate('teams', 'name')
            .sort('-createdAt');

        res.json(competitions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get competition by ID
// @route   GET /api/competitions/:id
// @access  Public
exports.getCompetition = async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id)
            .populate('organizer', 'name email')
            .populate('teams', 'name')
            .populate({
                path: 'matches',
                populate: {
                    path: 'team1.team team2.team winner',
                    select: 'name'
                }
            });

        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        res.json(competition);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update competition
// @route   PUT /api/competitions/:id
// @access  Private/Organizer
exports.updateCompetition = async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);

        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check if user is competition organizer
        if (competition.organizer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to update this competition' });
        }

        const updatedCompetition = await Competition.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('competitionUpdate', {
                type: 'update',
                competition: updatedCompetition,
                organizerId: updatedCompetition.organizer
            });
            
            // Also emit to the specific organizer's room
            mainNamespace.to(`user:${updatedCompetition.organizer}`).emit('competitionUpdate', {
                type: 'update',
                competition: updatedCompetition,
                organizerId: updatedCompetition.organizer
            });
            
            console.log('Emitted competitionUpdate event (update) for competition:', updatedCompetition._id);
        }

        res.json(updatedCompetition);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete competition
// @route   DELETE /api/competitions/:id
// @access  Private/Organizer
exports.deleteCompetition = async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);

        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check if user is competition organizer
        if (competition.organizer.toString() !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized to delete this competition' });
        }

        const competitionId = competition._id;
        const organizerId = competition.organizer;
        await competition.remove();

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('competitionUpdate', {
                type: 'delete',
                competitionId: competitionId,
                organizerId: organizerId
            });
            
            // Also emit to the specific organizer's room
            mainNamespace.to(`user:${organizerId}`).emit('competitionUpdate', {
                type: 'delete',
                competitionId: competitionId,
                organizerId: organizerId
            });
            
            console.log('Emitted competitionUpdate event (delete) for competition:', competitionId);
        }

        res.json({ message: 'Competition removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register team for competition
// @route   POST /api/competitions/:id/register
// @access  Private
exports.registerTeam = async (req, res) => {
    try {
        const competition = await Competition.findById(req.params.id);
        const { teamId } = req.body;

        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check if registration is still open
        if (new Date(competition.registrationDeadline) < new Date()) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        // Check if maximum teams reached
        if (competition.teams.length >= competition.maxTeams) {
            return res.status(400).json({ message: 'Maximum number of teams reached' });
        }

        // Check if team is already registered
        if (competition.teams.includes(teamId)) {
            return res.status(400).json({ message: 'Team is already registered' });
        }

        competition.teams.push(teamId);
        await competition.save();

        res.json(competition);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};