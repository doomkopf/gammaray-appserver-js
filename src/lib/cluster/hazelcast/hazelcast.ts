import { Member } from "hazelcast-client"

export function nodeIdFromHazelcastMember(member: Member): string {
  return member.uuid.toString()
}
