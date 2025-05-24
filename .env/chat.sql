CREATE TABLE users
(
    id       SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL
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
-- 添加用户
INSERT INTO users (username)
VALUES ('我'),
       ('Alice'),
       ('Bob'),
       ('Charlie');

-- 添加好友关系（我 <-> Alice）
INSERT INTO friends (user_id, friend_id)
SELECT u1.id, u2.id
FROM users u1,
     users u2
WHERE u1.username = '我'
  AND u2.username = 'Alice';

-- 创建群组
INSERT INTO groups (name, owner)
SELECT '编程小组', id
FROM users
WHERE username = '我';

-- 添加群成员
INSERT INTO group_members (group_id, member_id)
SELECT g.id, u.id
FROM groups g,
     users u
WHERE g.name = '编程小组'
  AND u.username IN ('我', 'Alice', 'Bob');
