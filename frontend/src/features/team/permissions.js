// Which roles each role may manage and hand out. The server enforces the same rule.
const MANAGEABLE = {
  owner: ["admin", "member", "client"],
  admin: ["member", "client"],
};

export const manageableRoles = (myRole) => {
  return MANAGEABLE[myRole] ?? [];
};

// Can this person change or remove that member? Never yourself, never the owner.
export const canManageMember = ({ myRole, myId, member }) => {
  if (member.userId === myId || member.role === "owner") {
    return false;
  }

  return manageableRoles(myRole).includes(member.role);
};
