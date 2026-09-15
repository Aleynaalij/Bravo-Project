"use client";

import { useActionState } from "react";
import type { TeamMember } from "@/lib/team/service";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  changeTeamMemberRoleAction,
  type TeamActionState,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const initialState: TeamActionState = {};

export function TeamSection({
  members,
  currentUserId,
  isOwner,
}: {
  members: TeamMember[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [state, formAction, isPending] = useActionState(inviteTeamMemberAction, initialState);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
          >
            <div>
              <div className="text-sm font-medium">
                {member.email}
                {member.id === currentUserId && <span className="ml-1 text-xs text-muted">(you)</span>}
              </div>
              <div className="text-xs text-muted">
                Joined {new Date(member.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={member.role === "owner" ? "brand" : "neutral"}>{member.role}</Badge>
              {isOwner && member.id !== currentUserId && (
                <>
                  <form action={changeTeamMemberRoleAction}>
                    <input type="hidden" name="userId" value={member.id} />
                    <input
                      type="hidden"
                      name="role"
                      value={member.role === "owner" ? "member" : "owner"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      Make {member.role === "owner" ? "member" : "owner"}
                    </Button>
                  </form>
                  <form
                    action={removeTeamMemberAction}
                    onSubmit={(e) => {
                      if (
                        !confirm(
                          `Remove ${member.email} from your team? They'll immediately lose access.`,
                        )
                      ) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="userId" value={member.id} />
                    <Button type="submit" variant="danger" size="sm">
                      Remove
                    </Button>
                  </form>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isOwner ? (
        <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="invite-email">
              Invite a teammate
            </label>
            <input
              id="invite-email"
              name="email"
              type="email"
              placeholder="teammate@bravocg.com"
              required
              className="rounded-md border border-border px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "Sending…" : "Send invite"}
          </Button>
        </form>
      ) : (
        <p className="border-t border-border pt-4 text-xs text-muted">
          Only the account owner can invite or remove teammates.
        </p>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">Invite sent.</Alert>}
    </div>
  );
}
