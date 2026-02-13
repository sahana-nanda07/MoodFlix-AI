const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movie_recommender',
  waitForConnections: true,
  connectionLimit: 10
});

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const GENRE_MAP = {
  Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
  Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
  Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749,
  "Science Fiction": 878, "TV Movie": 10770, Thriller: 53, War: 10752, Western: 37
};

app.get('/', (req, res) => {
  res.send('Movie Recommender Backend is Running');
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, error: 'Username is required' });

    const [result] = await pool.query(
      'INSERT INTO users (username) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
      [username]
    );

    res.json({ success: true, userId: result.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/mood-to-genres', async (req, res) => {
  try {
    const { mood, userId } = req.body;
    if (!mood) return res.status(400).json({ success: false, error: 'Mood is required' });

    const moodMap = {
      happy: { genres: ['Comedy','Romance','Family'], explanation: 'Feel‑good and lighthearted movies match a happy mood.' },
      sad: { genres: ['Drama','Romance'], explanation: 'Emotional stories suit a sad mood.' },
      bored: { genres: ['Action','Adventure','Science Fiction'], explanation: 'Exciting movies help when bored.' },
      stressed: { genres: ['Comedy','Family'], explanation: 'Light movies help reduce stress.' },
      excited: { genres: ['Action','Thriller'], explanation: 'High‑energy movies match excitement.' }
    };

    const result = moodMap[mood.toLowerCase()] || { genres: ['Drama'], explanation: 'Balanced genre selection.' };

    if (userId) {
      await pool.query(
        'INSERT INTO search_history (user_id, mood, genres) VALUES (?, ?, ?)',
        [userId, mood, JSON.stringify(result.genres)]
      );
    }

    res.json({ success: true, genres: result.genres, explanation: result.explanation });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/movies/recommendations', async (req, res) => {
  try {
    const { genres } = req.body;
    if (!genres || !Array.isArray(genres)) return res.status(400).json({ success: false, error: 'Genres array is required' });
    if (!TMDB_API_KEY) return res.status(500).json({ success: false, error: 'TMDB API key missing' });

    const genreIds = genres.map(g => GENRE_MAP[g]).filter(id => id);
    if (!genreIds.length) return res.status(400).json({ success: false, error: 'No valid genres provided' });

    const response = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
      params: { api_key: TMDB_API_KEY, with_genres: genreIds.join(','), sort_by: 'popularity.desc' }
    });

    res.json({ success: true, movies: response.data.results.slice(0, 12) });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// —— FIXED: Return correct poster field names ——//
app.post('/api/favourites', async (req, res) => {
  try {
    const { userId, movieId, movieTitle, moviePoster, movieRating } = req.body;
    if (!userId || !movieId || !movieTitle) return res.status(400).json({ success:false, error:'Missing required fields' });

    const [result] = await pool.query(
      `INSERT INTO favourites (user_id, movie_id, movie_title, movie_poster, movie_rating)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [userId, movieId, movieTitle, moviePoster || null, movieRating || null]
    );

    res.json({ success: true, favouriteId: result.insertId });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

app.get('/api/favourites/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT movie_id, movie_title, movie_poster, movie_rating, added_at FROM favourites WHERE user_id = ? ORDER BY added_at DESC',
      [req.params.userId]
    );

    // Format exactly what frontend expects
    const formatted = rows.map(row => ({
      movie_id: row.movie_id,
      movie_title: row.movie_title,
      moviePoster: row.movie_poster,  // correct property name
      movie_rating: row.movie_rating,
      added_at: row.added_at
    }));

    res.json({ success: true, favourites: formatted });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

// —— FIXED: Return genres as array for history ——//
app.get('/api/history/:userId', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, mood, genres, created_at FROM search_history WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );

    const formatted = rows.map(item => ({
      id: item.id,
      mood: item.mood,
      genres: JSON.parse(item.genres), // now an array
      searched_at: item.created_at
    }));

    res.json({ success: true, history: formatted });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

app.delete('/api/favourites/:userId/:movieId', async (req,res) => {
  try {
    await pool.query(
      'DELETE FROM favourites WHERE user_id = ? AND movie_id = ?',
      [req.params.userId, req.params.movieId]
    );
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

app.delete('/api/history/:id', async (req,res) => {
  try {
    await pool.query('DELETE FROM search_history WHERE id = ?', [req.params.id]);
    res.json({ success:true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
