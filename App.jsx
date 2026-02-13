import React, { useState, useEffect } from 'react';
import { Search, Heart, History, Film, Sparkles, Trash2 } from 'lucide-react';
import axios from 'axios';
import MovieCard from './components/MovieCard';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [currentView, setCurrentView] = useState('search');
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [movies, setMovies] = useState([]);
  const [favourites, setFavourites] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      try {
        const username = localStorage.getItem('username') || `user_${Date.now()}`;
        localStorage.setItem('username', username);
        const response = await axios.post(`${API_BASE_URL}/users`, { username });
        setUserId(response.data.userId);
      } catch (err) {
        console.error('Error initializing user:', err);
      }
    };
    initUser();
  }, []);

  // Fetch favourites when view or user changes
  useEffect(() => {
    if (currentView === 'favourites' && userId) fetchFavourites();
  }, [currentView, userId]);

  // Fetch history when view or user changes
  useEffect(() => {
    if (currentView === 'history' && userId) fetchHistory();
  }, [currentView, userId]);

  // Search movies based on mood
  const handleMoodSearch = async () => {
    if (!mood.trim()) {
      setError('Please enter your mood or situation');
      return;
    }
    setLoading(true);
    setError('');
    setMovies([]);
    try {
      const genreResponse = await axios.post(`${API_BASE_URL}/mood-to-genres`, { mood, userId });
      setGenres(genreResponse.data.genres);
      setExplanation(genreResponse.data.explanation);

      const movieResponse = await axios.post(`${API_BASE_URL}/movies/recommendations`, {
        genres: genreResponse.data.genres
      });
      setMovies(movieResponse.data.movies || []);
    } catch (err) {
      setError('Failed to get recommendations. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Add to favourites
  const addToFavourites = async (movie) => {
    if (!userId) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/favourites`, {
        userId: userId,
        movieId: movie.id || movie.movie_id,
        movieTitle: movie.title || movie.movie_title,
        moviePoster: movie.poster_path || movie.movie_poster || null,
        movieRating: movie.vote_average || movie.movie_rating || null
      });

      if (response.data.success) {
        alert('Added to favourites!');
        fetchFavourites();
      } else {
        alert('Failed to add: ' + response.data.error);
      }
    } catch (err) {
      console.error('Error adding to favourites:', err);
      alert('Failed to add to favourites');
    }
  };

  // Remove from favourites
  const removeFavourite = async (movieId) => {
    try {
      await axios.delete(`${API_BASE_URL}/favourites/${userId}/${movieId}`);
      fetchFavourites();
    } catch (err) {
      console.error('Error removing favourite:', err);
    }
  };

  const fetchFavourites = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/favourites/${userId}`);
      setFavourites(response.data.favourites || []);
    } catch (err) {
      console.error('Error fetching favourites:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/${userId}`);
      setSearchHistory(response.data.history || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const deleteHistoryItem = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/history/${id}`);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const searchFromHistory = async (historyMood, historyGenres) => {
    setCurrentView('search');
    setMood(historyMood);
    const parsedGenres = typeof historyGenres === 'string' ? JSON.parse(historyGenres) : historyGenres;
    setGenres(parsedGenres);
    setLoading(true);
    try {
      const movieResponse = await axios.post(`${API_BASE_URL}/movies/recommendations`, {
        genres: parsedGenres
      });
      setMovies(movieResponse.data.movies || []);
    } catch (err) {
      setError('Failed to load movies from history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black bg-opacity-50 backdrop-blur-md border-b border-purple-500">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Film size={32} className="text-purple-400" />
            <h1 className="text-2xl font-bold text-white">MoodFlix AI</h1>
          </div>
          <nav className="flex gap-4">
            <button
              onClick={() => setCurrentView('search')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView==='search'?'bg-purple-600 text-white':'text-gray-300 hover:bg-purple-700 hover:text-white'}`}
            >
              <Search size={20}/> Search
            </button>
            <button
              onClick={() => setCurrentView('favourites')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView==='favourites'?'bg-purple-600 text-white':'text-gray-300 hover:bg-purple-700 hover:text-white'}`}
            >
              <Heart size={20}/> Favourites
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${currentView==='history'?'bg-purple-600 text-white':'text-gray-300 hover:bg-purple-700 hover:text-white'}`}
            >
              <History size={20}/> History
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search View */}
        {currentView==='search' && (
          <div>
            {/* Mood Search */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl p-8 border border-purple-500">
                <div className="flex items-center gap-3 mb-4"><Sparkles size={28} className="text-yellow-400" /><h2 className="text-2xl font-bold text-white">How are you feeling today?</h2></div>
                <p className="text-gray-300 mb-6">Tell us your mood or situation, and we'll recommend the perfect movies for you!</p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={mood}
                    onChange={(e)=>setMood(e.target.value)}
                    onKeyPress={(e)=>e.key==='Enter' && handleMoodSearch()}
                    placeholder="e.g., feeling happy, need something exciting..."
                    className="flex-1 px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={handleMoodSearch}
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Search size={20}/>} Find Movies
                  </button>
                </div>
                {error && <p className="text-red-400 mt-3">{error}</p>}
              </div>
            </div>

            {/* Genres */}
            {genres.length>0 && (
              <div className="max-w-3xl mx-auto mb-8">
                <div className="bg-gradient-to-r from-purple-800 to-blue-800 rounded-xl p-6">
                  <h3 className="text-white font-bold text-lg mb-3">Recommended Genres for Your Mood:</h3>
                  <div className="flex flex-wrap gap-2 mb-4">{genres.map((genre,index)=><span key={index} className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-full font-semibold">{genre}</span>)}</div>
                  {explanation && <p className="text-gray-200 italic">"{explanation}"</p>}
                </div>
              </div>
            )}

            {/* Movies */}
            {movies.length>0 && (
              <div>
                <h2 className="text-3xl font-bold text-white mb-6">Your Movie Recommendations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {movies.map(movie => (
                    <MovieCard
                      key={movie.id || movie.movie_id}
                      movie={movie}
                      userId={userId}
                      onAddFavourite={addToFavourites}
                      onRemoveFavourite={removeFavourite}
                      showFavButton={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Favourites View */}
        {currentView === 'favourites' && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">My Favourites</h2>
            {favourites.length === 0 ? (
              <div className="text-center py-16">
                <Heart size={64} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">No favourites yet. Start adding movies you love!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favourites.map((movie) => (
                  <MovieCard
                    key={movie.movie_id}
                    movie={movie}
                    userId={userId}
                    onAddFavourite={addToFavourites}
                    onRemoveFavourite={removeFavourite}
                    showFavButton={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {currentView==='history' && (
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">Search History</h2>
            {searchHistory.length===0 ? (
              <div className="text-center py-16">
                <History size={64} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">No search history yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchHistory.map(item => {
                  const parsedGenres = typeof item.genres === 'string' ? JSON.parse(item.genres) : item.genres;
                  return (
                    <div key={item.id} className="bg-black bg-opacity-40 backdrop-blur-md rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Sparkles size={20} className="text-yellow-400" />
                            <h3 className="text-white font-bold text-lg">"{item.mood}"</h3>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {parsedGenres.map((g,i) => <span key={i} className="bg-purple-700 text-white px-3 py-1 rounded-full text-sm">{g}</span>)}
                          </div>
                          <p className="text-gray-400 text-sm">{new Date(item.searched_at || item.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => searchFromHistory(item.mood, item.genres)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">Search Again</button>
                          <button onClick={() => deleteHistoryItem(item.id)} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-black bg-opacity-50 border-t border-purple-500 mt-16">
        <div className="container mx-auto px-4 py-6 text-center text-gray-400">
          <p>Powered by Gemini AI & TMDB • Built with React + Node.js + Python</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

