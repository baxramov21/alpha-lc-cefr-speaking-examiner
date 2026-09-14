-- Migrate existing 'task1' questions to 'task1_1'
UPDATE questions
SET part = 'task1_1'
WHERE part = 'task1';
