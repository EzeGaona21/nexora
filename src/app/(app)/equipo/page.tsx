import type { Metadata } from "next";

import { TeamView, type PendingInvitation, type TeamMember } from "@/components/team/team-view";
import { getSessionContext } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Equipo" };

export default async function TeamPage() {
  const ctx = await getSessionContext();

  const [membersRes, invitationsRes] = await Promise.all([
    ctx.supabase.rpc("team_members", { p_org: ctx.org.id }),
    // RLS: solo los administradores ven las invitaciones.
    ctx.supabase
      .from("invitations")
      .select("id, email, role")
      .eq("org_id", ctx.org.id)
      .order("created_at", { ascending: true }),
  ]);
  if (membersRes.error) throw new Error(membersRes.error.message);
  if (invitationsRes.error) throw new Error(invitationsRes.error.message);

  const members: TeamMember[] = ((membersRes.data ?? []) as Record<string, unknown>[]).map((m) => {
    const email = String(m.email ?? "");
    return {
      userId: String(m.user_id),
      name: (m.full_name ? String(m.full_name) : "") || email.split("@")[0] || "Usuario",
      // En la demo pública no se exponen direcciones de correo.
      email: ctx.org.is_demo ? "Cuenta de demostración" : email,
      role: m.role as TeamMember["role"],
      joinedAt: String(m.joined_at),
    };
  });
  const invitations = (invitationsRes.data ?? []) as PendingInvitation[];
  const plan = getPlan(ctx.org.plan);

  return (
    <TeamView
      members={members}
      invitations={invitations}
      currentUserId={ctx.user.id}
      isAdmin={ctx.isAdmin}
      seats={{ used: members.length + invitations.length, limit: plan.limits.users }}
      planName={plan.name}
    />
  );
}
