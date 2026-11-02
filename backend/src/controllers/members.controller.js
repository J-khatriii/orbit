import * as memberService from "../services/member.service.js";

// req.user comes from requireAuth. req.workspace and req.membership come from workspaceContext.
const actorOf = (req) => {
  return { id: req.user.id, role: req.membership.role };
};

export const changeMemberRole = async (req, res) => {
  const member = await memberService.changeMemberRole({
    workspaceId: req.workspace.id,
    actor: actorOf(req),
    userId: req.params.userId,
    role: req.validated.body.role,
  });

  res.json({ member });
};

export const removeMember = async (req, res) => {
  await memberService.removeMember({
    workspaceId: req.workspace.id,
    actor: actorOf(req),
    userId: req.params.userId,
  });

  res.status(204).end();
};
