import React, { useState, useEffect } from 'react';

const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const Trending = () => {
  const [shows, setShows] = useState([]);
  const [selectedShow, setSelectedShow] = useState(null);

  useEffect(() => {
    const fetchNetflixContent = async () => {
      try {
        const moviesResponse = await fetch(
          `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US`
        );

        const tvResponse = await fetch(
          `${TMDB_BASE_URL}/discover/tv?api_key=${TMDB_API_KEY}&with_watch_providers=8&watch_region=US`
        );

        if (!moviesResponse.ok || !tvResponse.ok) {
          throw new Error('Could not fetch Netflix content.');
        }

        const moviesData = await moviesResponse.json();
        const tvData = await tvResponse.json();

        const combinedContent = [
          ...moviesData.results.map((item) => ({
            id: item.id,
            title: item.title || 'Untitled',
            description: item.overview || 'No description available.',
            image: item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : 'https://via.placeholder.com/500x750?text=No+Image',
            type: 'Movie',
            rating: item.vote_average ? Math.round(item.vote_average * 10) : null,
          })),
          ...tvData.results.map((item) => ({
            id: item.id,
            title: item.name || 'Untitled',
            description: item.overview || 'No description available.',
            image: item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : 'https://via.placeholder.com/500x750?text=No+Image',
            type: 'TV Show',
            rating: item.vote_average ? Math.round(item.vote_average * 10) : null,
          })),
        ];

        setShows(combinedContent);
      } catch (error) {
        console.error('Could not fetch Netflix content:', error);
      }
    };

    fetchNetflixContent();
  }, []);

  const fetchContentDetails = async (id, type) => {
    try {
      const endpoint = type === 'Movie' ? 'movie' : 'tv';

      const response = await fetch(`${TMDB_BASE_URL}/${endpoint}/${id}?api_key=${TMDB_API_KEY}`);
      const data = await response.json();

      const videosResponse = await fetch(
        `${TMDB_BASE_URL}/${endpoint}/${id}/videos?api_key=${TMDB_API_KEY}`
      );
      const videosData = await videosResponse.json();

      const reviewsResponse = await fetch(
        `${TMDB_BASE_URL}/${endpoint}/${id}/reviews?api_key=${TMDB_API_KEY}`
      );
      const reviewsData = await reviewsResponse.json();

      setSelectedShow({
        title: type === 'Movie' ? data.title : data.name,
        description: data.overview,
        genre: data.genres.map((g) => g.name).join(', '),
        videos: videosData.results.filter((video) => video.type === 'Trailer' || video.type === 'Teaser'),
        reviews: reviewsData.results.map((review) => ({
          author: review.author,
          content: review.content,
        })),
        image: data.poster_path
          ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
          : 'https://via.placeholder.com/500x750?text=No+Image',
      });

      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error fetching details:', error);
    }
  };

  return (
    <div className="bg-black text-white min-h-screen p-4">
      <h2 className="text-3xl font-bold mb-4">Trending on Netflix</h2>
      {selectedShow ? (
        <div>
          <button
            className="mb-4 text-red-500 hover:text-red-700"
            onClick={() => setSelectedShow(null)}
          >
            Back
          </button>

          <div
            className="p-6 bg-gray-800 rounded-lg shadow-md"
            style={{
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '200px 1fr',
              columnGap: '20px',
            }}
          >

            <div>
              <img
                src={selectedShow.image}
                alt={selectedShow.title}
                className="rounded-lg shadow-lg"
                style={{
                  width: '200px',
                  height: 'auto'
                }}
              />
            </div>

            <div style={{ overflow: "hidden" }}>
              <h3 className="text-3xl font-bold">{selectedShow.title}</h3>
              <p
                className="mt-2 text-gray-300"
                style={{
                  whiteSpace: "normal",
                  overflowWrap: "break-word",
                  lineHeight: "1.5",
                }}
              >
                {selectedShow.description}
              </p>
              <p className="mt-4 text-sm text-gray-400">
                <strong>Genres:</strong> {selectedShow.genre}
              </p>

              <div className="mt-6">
                <h4 className="text-lg font-bold">Related Videos</h4>
                <div
                  className="flex gap-4 overflow-x-auto"
                  style={{
                    display: "flex",
                    maxWidth: "100%",
                    padding: "10px 0",
                    overflowX: "auto",
                    whiteSpace: "nowrap",

                  }}
                >
                  {selectedShow.videos.length > 0 ? (
                    selectedShow.videos.map((video) => (
                      <div
                        key={video.id}
                        className="flex-shrink-0"
                        style={{
                          width: '240px',
                          height: '135px',
                          borderRadius: '8px',
                          flex: "0 0 auto",
                          overflowY: 'hidden'
                        }}
                      >
                        <iframe
                          src={`https://www.youtube.com/embed/${video.key}`}
                          title={video.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            border: "none",
                            display: "block",
                          }}
                          allowFullScreen

                        ></iframe>
                      </div>
                    ))
                  ) : (
                    <p>No related videos available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-800 rounded-lg shadow-md mt-6">
            <h4 className="text-lg font-bold mb-4">Reviews</h4>
            {selectedShow.reviews.length > 0 ? (
              <div className="grid gap-4">
                {selectedShow.reviews.map((review, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-900 rounded shadow-md"
                  >
                    <h5 className="text-xl font-bold mb-1">{review.author}</h5>
                    <p className="text-sm text-gray-500 mb-2">Review from TMDb</p>
                    <p
                      className="text-gray-300 text-sm"
                      style={{ lineHeight: '1.5' }}
                      dangerouslySetInnerHTML={{
                        __html: review.content
                          .replace(/ {5}/g, '<br>')
                          .replace(/\n/g, '<br>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em>$1</em>')
                          .replace(/\_(.*?)\_/g, '<em>$1</em>')
                      }}
                    ></p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No reviews available.</p>
            )}
          </div>

        </div>
      ) : (
        <>

          <h3 className="text-2xl font-bold mt-4 mb-2">Movies</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {shows
              .filter((show) => show.type === 'Movie')
              .map((movie) => (
                <div
                  key={movie.id}
                  className="bg-gray-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => fetchContentDetails(movie.id, movie.type)}
                >
                  <img
                    src={movie.image}
                    alt={movie.title}
                    className="rounded-t-lg w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold truncate">{movie.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{movie.type}</p>
                    <span className="text-yellow-400 font-bold block mt-2">☆ {movie.rating / 10}/10</span>
                  </div>
                </div>
              ))}
          </div>

          <h3 className="text-2xl font-bold mt-10 mb-2">TV Shows</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {shows
              .filter((show) => show.type === 'TV Show')
              .map((tvShow) => (
                <div
                  key={tvShow.id}
                  className="bg-gray-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                  onClick={() => fetchContentDetails(tvShow.id, tvShow.type)}
                >
                  <img
                    src={tvShow.image}
                    alt={tvShow.title}
                    className="rounded-t-lg w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold truncate">{tvShow.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{tvShow.type}</p>
                    <span className="text-yellow-400 font-bold block mt-2">☆ {tvShow.rating / 10}/10</span>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
};


export default Trending;
