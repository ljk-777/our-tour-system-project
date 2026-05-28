import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { addFavorite, removeFavorite, getMyFavoriteIds } from '../api/index.js';

const FavoritesContext = createContext({
  favoriteIds: new Set(),
  toggle: async () => {},
  isFavorited: () => false,
  loading: false,
});

export function FavoritesProvider({ children }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return; }
    setLoading(true);
    getMyFavoriteIds()
      .then(r => setFavoriteIds(new Set(r.data.data || [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggle = useCallback(async (spotId) => {
    const id = Number(spotId);
    if (favoriteIds.has(id)) {
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      await removeFavorite(id).catch(() => {
        // 回滚
        setFavoriteIds(prev => new Set([...prev, id]));
      });
    } else {
      setFavoriteIds(prev => new Set([...prev, id]));
      await addFavorite(id).catch(() => {
        setFavoriteIds(prev => { const s = new Set(prev); s.delete(id); return s; });
      });
    }
  }, [favoriteIds]);

  const isFavorited = useCallback(
    (spotId) => favoriteIds.has(Number(spotId)),
    [favoriteIds]
  );

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggle, isFavorited, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
