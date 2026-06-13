export type IpsMeProfile = {
  id?: number;
  primaryGroup?: { id?: number };
};

/** Returns true when the member is allowed to use MCP (admin group or explicit member allowlist). */
export function isMemberAllowedForMcp(
  profile: IpsMeProfile,
  adminGroupIds: number[],
  allowedMemberIds: number[],
): boolean {
  const memberId = profile.id;
  if (memberId !== undefined && allowedMemberIds.length > 0) {
    return allowedMemberIds.includes(memberId);
  }

  if (adminGroupIds.length === 0) {
    return false;
  }

  const groupId = profile.primaryGroup?.id;
  if (groupId === undefined) {
    return false;
  }

  return adminGroupIds.includes(groupId);
}
