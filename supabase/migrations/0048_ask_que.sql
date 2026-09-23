-- "Ask Que" — a single-shot version of the platform assistant (revised
-- down from an earlier, unmerged multi-turn chat design once the
-- per-conversation AI cost of open-ended chat memory was flagged as a
-- real concern). One question in, one grounded answer out, exactly the
-- same shape as the Troubleshooting Engine and Architecture Advisor — so
-- it joins them as a third eks_requests feature rather than getting its
-- own conversation-storage tables. No new table needed at all.
alter table public.eks_requests drop constraint eks_requests_feature_check;
alter table public.eks_requests add constraint eks_requests_feature_check
  check (feature in ('troubleshoot', 'architecture_advisor', 'ask_que'));
