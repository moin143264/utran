/**
 * Generate tournament brackets based on the number of teams
 * Supports single elimination tournament format
 */
class BracketGenerator {
    constructor(teams) {
        this.teams = teams;
        this.rounds = Math.ceil(Math.log2(teams.length));
        this.totalMatches = Math.pow(2, this.rounds) - 1;
    }

    /**
     * Generate matches for the tournament
     * @returns {Array} Array of matches with team pairings
     */
    generateBrackets() {
        const matches = [];
        const numTeams = this.teams.length;
        const firstRoundTeams = this.getFirstRoundTeams();

        // Generate first round matches
        for (let i = 0; i < firstRoundTeams.length; i += 2) {
            matches.push({
                round: 1,
                matchNumber: Math.floor(i / 2) + 1,
                team1: firstRoundTeams[i],
                team2: firstRoundTeams[i + 1],
                nextMatchNumber: Math.floor(Math.floor(i / 2) / 2) + 1,
                nextRound: 2
            });
        }

        // Generate subsequent round placeholders
        for (let round = 2; round <= this.rounds; round++) {
            const matchesInRound = Math.pow(2, this.rounds - round);
            for (let match = 1; match <= matchesInRound; match++) {
                matches.push({
                    round: round,
                    matchNumber: match,
                    team1: null,
                    team2: null,
                    nextMatchNumber: Math.floor((match - 1) / 2) + 1,
                    nextRound: round < this.rounds ? round + 1 : null
                });
            }
        }

        return matches;
    }

    /**
     * Get teams for the first round, including byes
     * @returns {Array} Array of teams with byes filled in
     */
    getFirstRoundTeams() {
        const numTeams = this.teams.length;
        const perfectBracketSize = Math.pow(2, this.rounds);
        const numByes = perfectBracketSize - numTeams;

        // Create array with actual teams
        const firstRoundTeams = [...this.teams];

        // Add byes to complete the bracket
        for (let i = 0; i < numByes; i++) {
            firstRoundTeams.push(null); // null represents a bye
        }

        // Shuffle teams to randomize matchups
        this.shuffleArray(firstRoundTeams);

        return firstRoundTeams;
    }

    /**
     * Update bracket after a match is completed
     * @param {Array} brackets Current bracket state
     * @param {Object} completedMatch Match that was completed
     * @param {Object} winner Winner of the match
     * @returns {Array} Updated brackets
     */
    updateBracket(brackets, completedMatch, winner) {
        const { round, matchNumber, nextRound, nextMatchNumber } = completedMatch;

        if (!nextRound || !nextMatchNumber) return brackets;

        const nextMatch = brackets.find(
            match => match.round === nextRound && match.matchNumber === nextMatchNumber
        );

        if (!nextMatch) return brackets;

        // Determine if winner should be placed in team1 or team2 slot
        const isEvenMatch = matchNumber % 2 === 0;
        if (isEvenMatch) {
            nextMatch.team2 = winner;
        } else {
            nextMatch.team1 = winner;
        }

        return brackets;
    }

    /**
     * Shuffle array using Fisher-Yates algorithm
     * @param {Array} array Array to shuffle
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

module.exports = BracketGenerator;