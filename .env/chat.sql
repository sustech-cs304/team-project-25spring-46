-- CREATE TABLE users
-- (
--     id       SERIAL PRIMARY KEY,
--     username VARCHAR(50) UNIQUE NOT NULL
-- );
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),  -- 暂时没用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE friends
(
    user_id   INTEGER REFERENCES users (id) ON DELETE CASCADE,
    friend_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, friend_id)
);
CREATE TABLE groups
(
    id    SERIAL PRIMARY KEY,
    name  VARCHAR(100) NOT NULL,
    owner INTEGER REFERENCES users (id)
);
CREATE TABLE group_members
(
    group_id  INTEGER REFERENCES groups (id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, member_id)
);
CREATE TABLE friend_message
(
    id       SERIAL PRIMARY KEY,
    sender   INTEGER REFERENCES users (id) ON DELETE CASCADE,
    receiver INTEGER REFERENCES users (id) ON DELETE CASCADE,
    text     TEXT        NOT NULL,
    time     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE group_message
(
    id       SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups (id) ON DELETE CASCADE,
    sender   INTEGER REFERENCES users (id) ON DELETE CASCADE,
    text     TEXT        NOT NULL,
    time     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
