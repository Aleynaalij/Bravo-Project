-- "Que" — the conversational assistant surfaced on the dashboard home
-- page, under the "New project" button. Distinct from every other AI
-- feature in this schema (deliverable generation, Troubleshooting Engine,
-- Architecture Advisor, Code Auditor/Creator), which are all single-shot
-- structured-request-in/validated-response-out flows: this is genuinely
-- multi-turn, so it needs real conversation storage rather than a
-- request-log table like eks_requests/automation_requests.
create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  user_email text not null,
  -- Set once at creation from the first user message (truncated) — avoids
  -- needing an update policy just to keep a title in sync.
  title text not null,
  created_at timestamptz not null default now()
);

-- account_id is denormalized here too (not just reachable via the parent
-- conversation) so both RLS and the rate limiter (src/lib/assistant/
-- rate-limit.ts) can query this table directly, same flat shape
-- eks_requests/automation_requests/content_views all use rather than an
-- ownership-via-parent-row join.
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.assistant_conversations(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Set on the assistant's reply when that turn generated a real SOP
  -- ("generate an SOP for this") — lets the chat UI render a link to it
  -- without a second query, and lets a future "SOPs generated from chat"
  -- view exist without inventing a new join table.
  generated_sop_id uuid references public.sops(id) on delete set null,
  created_at timestamptz not null default now()
);

create index assistant_conversations_account_created_idx
  on public.assistant_conversations (account_id, created_at desc);
create index assistant_conversations_user_id_idx
  on public.assistant_conversations (user_id);
create index assistant_messages_conversation_created_idx
  on public.assistant_messages (conversation_id, created_at);
create index assistant_messages_account_created_idx
  on public.assistant_messages (account_id, created_at);
create index assistant_messages_generated_sop_id_idx
  on public.assistant_messages (generated_sop_id);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

-- select/insert/delete on conversations (a user can clear a conversation),
-- select/insert only on messages (append-only within one — same
-- convention as eks_requests/automation_requests).
create policy "assistant_conversations_select"
  on public.assistant_conversations
  for select
  using (account_id = auth_account_id());

create policy "assistant_conversations_insert"
  on public.assistant_conversations
  for insert
  with check (account_id = auth_account_id());

create policy "assistant_conversations_delete"
  on public.assistant_conversations
  for delete
  using (account_id = auth_account_id());

create policy "assistant_messages_select"
  on public.assistant_messages
  for select
  using (account_id = auth_account_id());

create policy "assistant_messages_insert"
  on public.assistant_messages
  for insert
  with check (account_id = auth_account_id());
