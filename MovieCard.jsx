import React from 'react';
import { Heart, Trash2 } from 'lucide-react';

const MovieCard = ({ movie, userId, onAddFavourite, onRemoveFavourite, showFavButton }) => {
  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : movie.moviePoster
    ? `https://image.tmdb.org/t/p/w500${movie.moviePoster}`
    : '/placeholder.png'; // optional fallback image

  const title = movie.title || movie.movie_title;
  const rating = movie.vote_average || movie.movie_rating;

  return (
    <div className="bg-black bg-opacity-40 backdrop-blur-md rounded-2xl border border-purple-500 overflow-hidden shadow-lg flex flex-col">
      <img src={posterUrl} alt={title} className="w-full h-64 object-cover" />
      <div className="p-4 flex-1 flex flex-col justify-between">
        <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
        {rating && <p className="text-yellow-400 font-semibold mb-2">Rating: {rating}</p>}
        {showFavButton ? (
          <button
            onClick={() => onAddFavourite(movie)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
          >
            <Heart size={16} /> Add to Favourites
          </button>
        ) : (
          <button
            onClick={() => onRemoveFavourite(movie.movie_id)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
          >
            <Trash2 size={16} /> Remove
          </button>
        )}
      </div>
    </div>
  );
};

export default MovieCard;







