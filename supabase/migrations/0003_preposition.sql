-- Adds "preposition" as a valid part_of_speech (Oxford 5000 word bank has some).
alter table words drop constraint words_part_of_speech_check;
alter table words add constraint words_part_of_speech_check
  check (part_of_speech in ('verb', 'noun', 'adjective', 'adverb', 'phrase', 'preposition', 'other'));
