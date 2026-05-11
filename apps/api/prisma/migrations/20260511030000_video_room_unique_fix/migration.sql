-- Drop unique constraint on video_sessions.room_name.
-- The constraint prevented starting a second video call in the same conversation
-- after the first ended (room name was derived from conversation id only).
-- Room names now include the session id and are unique by virtue of cuid().
DROP INDEX IF EXISTS "video_sessions_room_name_key";
