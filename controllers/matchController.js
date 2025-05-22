const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Match = require('../models/Match');
const Competition = require('../models/Competition');
const Team = require('../models/Team'); // Add Team model import

// @desc    Create new match
// @route   POST /api/matches
// @access  Private/Organizer
exports.createMatch = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { competitionId, team1Id, team2Id, startTime, venue, round, matchNumber } = req.body;

        // Check if competition exists
        const competition = await Competition.findById(competitionId);
        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check if user is competition organizer
        if (competition.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to create matches' });
        }

        // Fetch team details to get names
        const [team1, team2] = await Promise.all([
            Team.findById(team1Id),
            Team.findById(team2Id)
        ]);

        if (!team1 || !team2) {
            return res.status(404).json({ message: 'One or both teams not found' });
        }

        const match = await Match.create({
            competition: competitionId,
            team1: { 
                team: team1Id,
                name: team1.name, // Store team name
                score: 0
            },
            team2: { 
                team: team2Id,
                name: team2.name, // Store team name
                score: 0
            },
            startTime,
            venue,
            round,
            matchNumber
        });

        // Add match to competition
        competition.matches.push(match._id);
        await competition.save();

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('matchUpdate', {
                type: 'create',
                match: match,
                competitionId: competitionId,
                competitionOrganizerId: competition.organizer
            });
            
            // Also emit to the specific organizer's room
            mainNamespace.to(`user:${competition.organizer}`).emit('matchUpdate', {
                type: 'create',
                match: match,
                competitionId: competitionId,
                competitionOrganizerId: competition.organizer
            });
            
            console.log('Emitted matchUpdate event (create) for match:', match._id);
        }

        res.status(201).json(match);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all matches
// @route   GET /api/matches
// @access  Public
exports.getMatches = async (req, res) => {
    try {
        let query = {};
        
        // If competitionId is provided in query params, filter by it
        if (req.query.competitionId) {
            query.competition = req.query.competitionId;
        }

        const matches = await Match.find(query)
            .populate('team1.team', 'name')
            .populate('team2.team', 'name')
            .populate('competition', 'name');

        res.json(matches);
    } catch (error) {
        console.error('Get matches error:', error);
        res.status(500).json({ message: 'Failed to load matches' });
    }
};

// @desc    Get matches by competition ID
// @route   GET /api/matches/competition/:competitionId
// @access  Public
exports.getMatchesByCompetition = async (req, res) => {
  console.log('[matchController.js] Entered getMatchesByCompetition'); 
  const { competitionId } = req.params;
  console.log(`[matchController.js] Attempting to fetch matches for competitionId: ${competitionId}`);
  const { status } = req.query; // For potential status filtering

  try {
    let filter = { competition: competitionId };
    if (status) {
      filter.status = status;
    }

    console.log(`[matchController.js] Mongoose filter: ${JSON.stringify(filter)}`);

    const matches = await Match.find(filter)
      .populate('team1.team', 'name _id') 
      .populate('team2.team', 'name _id') 
      .sort({ round: 1, startTime: 1 });

    console.log(`[matchController.js] Found ${matches.length} matches for competitionId: ${competitionId}`);

    if (!matches || matches.length === 0) {
      // Log if no matches are found, but still return an empty array (200 OK)
      console.log(`[matchController.js] No matches found for competitionId: ${competitionId} with filter: ${JSON.stringify(filter)}`);
      return res.status(200).json([]); // Return 200 with empty array if no matches
    }

    res.status(200).json(matches);
  } catch (error) {
    console.error('[matchController.js] Error fetching matches by competition:', error.message);
    console.error("[matchController.js] Competition ID:", competitionId);
    // console.error("[matchController.js] Filter used:", filter); // filter might not be defined here if error is early
    console.error("[matchController.js] Stack trace:", error.stack);
    res.status(500).json({ message: 'Error fetching matches by competition', error: error.message });
  }
};

// @desc    Get match by ID
// @route   GET /api/matches/:id
// @access  Public
exports.getMatch = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('competition', 'name')
            .populate('team1.team', 'name')
            .populate('team2.team', 'name')
            .populate('winner', 'name')
            .populate('referee', 'name');

        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        res.json(match);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update match result
// @route   PUT /api/matches/:id/result
// @access  Private/Organizer
exports.updateMatchResult = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const competition = await Competition.findById(match.competition);
        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check authorization
        if (competition.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to update match result' });
        }

        const { team1Score, team2Score, status, winnerId } = req.body;

        match.team1.score = team1Score;
        match.team2.score = team2Score;
        match.status = status || 'completed';
        match.winner = winnerId;
        match.endTime = Date.now();

        await match.save();

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('matchUpdate', {
                type: 'update',
                match: match,
                competitionId: match.competition,
                competitionOrganizerId: competition.organizer
            });
            
            // Also emit to the specific organizer's room
            mainNamespace.to(`user:${competition.organizer}`).emit('matchUpdate', {
                type: 'update',
                match: match,
                competitionId: match.competition,
                competitionOrganizerId: competition.organizer
            });
            
            console.log('Emitted matchUpdate event (update) for match:', match._id);
        }

        res.json(match);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete match
// @route   DELETE /api/matches/:id
// @access  Private/Organizer
exports.deleteMatch = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ message: 'Match not found' });
        }

        const competition = await Competition.findById(match.competition);
        if (!competition) {
            return res.status(404).json({ message: 'Competition not found' });
        }

        // Check authorization
        if (competition.organizer.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to delete match' });
        }

        // Remove match from competition
        competition.matches = competition.matches.filter(
            (matchId) => matchId.toString() !== match._id.toString()
        );
        await competition.save();

        const matchId = match._id;
        const competitionId = match.competition;
        await match.remove();

        // Emit socket event for real-time update
        const io = req.app.get('io');
        if (io) {
            const mainNamespace = io.of('/main');
            
            // Emit to everyone
            mainNamespace.emit('matchUpdate', {
                type: 'delete',
                matchId: matchId,
                competitionId: competitionId,
                competitionOrganizerId: competition.organizer
            });
            
            // Also emit to the specific organizer's room
            mainNamespace.to(`user:${competition.organizer}`).emit('matchUpdate', {
                type: 'delete',
                matchId: matchId,
                competitionId: competitionId,
                competitionOrganizerId: competition.organizer
            });
            
            console.log('Emitted matchUpdate event (delete) for match:', matchId);
        }

        res.json({ message: 'Match removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};