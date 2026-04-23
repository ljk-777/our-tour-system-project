const { query } = require('./index');

const schemaStatements = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
  `
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      nickname VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      password_hash VARCHAR(255),
      avatar TEXT,
      city VARCHAR(100),
      level VARCHAR(50),
      bio TEXT,
      total_diaries INTEGER NOT NULL DEFAULT 0,
      total_spots INTEGER NOT NULL DEFAULT 0,
      join_date DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS spots (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type VARCHAR(50) NOT NULL,
      city VARCHAR(100),
      province VARCHAR(100),
      lat NUMERIC(10, 6),
      lng NUMERIC(10, 6),
      description TEXT,
      rating NUMERIC(2, 1) DEFAULT 0,
      visit_time INTEGER DEFAULT 0,
      entrance_fee NUMERIC(10, 2) DEFAULT 0,
      open_hours VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS spot_tags (
      id BIGSERIAL PRIMARY KEY,
      spot_id BIGINT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      tag VARCHAR(50) NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS route_edges (
      id BIGSERIAL PRIMARY KEY,
      from_spot_id BIGINT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      to_spot_id BIGINT NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
      dist INTEGER NOT NULL,
      time_cost INTEGER NOT NULL,
      transport VARCHAR(20) NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS diaries (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_name VARCHAR(100),
      user_avatar TEXT,
      spot_id BIGINT REFERENCES spots(id) ON DELETE SET NULL,
      spot_name VARCHAR(200),
      title VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      cover_image TEXT,
      rating NUMERIC(2, 1) DEFAULT 0,
      visit_date DATE,
      weather VARCHAR(50),
      mood VARCHAR(50),
      likes_count INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS diary_tags (
      id BIGSERIAL PRIMARY KEY,
      diary_id BIGINT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
      tag VARCHAR(50) NOT NULL
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS diary_comments (
      id BIGSERIAL PRIMARY KEY,
      diary_id BIGINT NOT NULL REFERENCES diaries(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      user_name VARCHAR(100),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `CREATE INDEX IF NOT EXISTS idx_spots_city ON spots(city);`,
  `CREATE INDEX IF NOT EXISTS idx_spots_type ON spots(type);`,
  `CREATE INDEX IF NOT EXISTS idx_spots_province ON spots(province);`,
  `CREATE INDEX IF NOT EXISTS idx_spots_rating ON spots(rating DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_spots_name_trgm ON spots USING gin (name gin_trgm_ops);`,
  `CREATE INDEX IF NOT EXISTS idx_spot_tags_spot_id ON spot_tags(spot_id);`,
  `CREATE INDEX IF NOT EXISTS idx_spot_tags_tag ON spot_tags(tag);`,
  `CREATE INDEX IF NOT EXISTS idx_route_edges_from ON route_edges(from_spot_id);`,
  `CREATE INDEX IF NOT EXISTS idx_route_edges_to ON route_edges(to_spot_id);`,
  `CREATE INDEX IF NOT EXISTS idx_route_edges_transport ON route_edges(transport);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_user_id ON diaries(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_spot_id ON diaries(spot_id);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_created_at ON diaries(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_likes_count ON diaries(likes_count DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_views_count ON diaries(views_count DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_title_trgm ON diaries USING gin (title gin_trgm_ops);`,
  `CREATE INDEX IF NOT EXISTS idx_diaries_content_trgm ON diaries USING gin (content gin_trgm_ops);`,
  `CREATE INDEX IF NOT EXISTS idx_diary_tags_diary_id ON diary_tags(diary_id);`,
  `CREATE INDEX IF NOT EXISTS idx_diary_tags_tag ON diary_tags(tag);`,
  `CREATE INDEX IF NOT EXISTS idx_diary_comments_diary_id ON diary_comments(diary_id);`,
];

async function initSchema() {
  for (const statement of schemaStatements) {
    await query(statement);
  }
}

module.exports = {
  initSchema,
};
