-- Adds conjunction/pronoun/number as valid part_of_speech values.
alter table words drop constraint words_part_of_speech_check;
alter table words add constraint words_part_of_speech_check
  check (part_of_speech in ('verb', 'noun', 'adjective', 'adverb', 'phrase', 'preposition', 'conjunction', 'pronoun', 'number', 'other'));
