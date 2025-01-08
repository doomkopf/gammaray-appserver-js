export interface Command {
  pl: string
  cmd?: number
  id?: string
}

export function requestCommand(cmd: number, id: string, pl: string): Command {
  return { cmd, id, pl }
}

export function responseCommand(id: string, pl: string): Command {
  return { id, pl }
}

export function sendCommand(cmd: number, pl: string): Command {
  return { cmd, pl }
}
