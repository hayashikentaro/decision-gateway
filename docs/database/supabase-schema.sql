create table if not exists public.taskdeck_instances (
  id text primary key,
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.pairing_tokens (
  id text primary key,
  taskdeck_instance_id text not null references public.taskdeck_instances(id),
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.paired_devices (
  id text primary key,
  taskdeck_instance_id text not null references public.taskdeck_instances(id),
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.mobile_sessions (
  id text primary key,
  paired_device_id text not null references public.paired_devices(id),
  session_token_hash text not null,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.decision_requests (
  id text primary key,
  request_id text not null,
  taskdeck_instance_id text,
  task_id text,
  session_id text,
  status text not null,
  url text not null,
  source jsonb not null,
  goal text not null,
  axis text not null,
  urgency text not null,
  decision_question text not null,
  semantic_summary text not null,
  materials jsonb not null,
  recommended_decision jsonb,
  relevant_facts jsonb,
  risks jsonb,
  raw_payload jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  expires_at timestamptz
);

create table if not exists public.decision_actions (
  id text primary key,
  decision_request_id text not null references public.decision_requests(id) on delete cascade,
  paired_device_id text references public.paired_devices(id),
  type text not null,
  condition text,
  reason text,
  decided_at timestamptz not null
);

create index if not exists pairing_tokens_taskdeck_instance_id_idx
  on public.pairing_tokens(taskdeck_instance_id);

create index if not exists pairing_tokens_token_hash_idx
  on public.pairing_tokens(token_hash);

create unique index if not exists mobile_sessions_session_token_hash_idx
  on public.mobile_sessions(session_token_hash);

create index if not exists paired_devices_taskdeck_instance_id_idx
  on public.paired_devices(taskdeck_instance_id);

create index if not exists decision_requests_request_id_idx
  on public.decision_requests(request_id);

create index if not exists decision_requests_taskdeck_instance_id_idx
  on public.decision_requests(taskdeck_instance_id);

create index if not exists decision_actions_decision_request_id_idx
  on public.decision_actions(decision_request_id);

alter table public.taskdeck_instances enable row level security;
alter table public.pairing_tokens enable row level security;
alter table public.paired_devices enable row level security;
alter table public.mobile_sessions enable row level security;
alter table public.decision_requests enable row level security;
alter table public.decision_actions enable row level security;
