export type Capability =
  | 'dom.render'
  | 'filesystem.read'
  | 'filesystem.write'
  | 'media.camera'
  | 'media.microphone'
  | 'network.http'
  | 'network.tcp'
  | 'process.spawn'
  | 'storage.local'
  | `extension.${string}`

export type CapabilityManifest = {
  required?: Capability[]
  optional?: Capability[]
}

export type CapabilityDecision = {
  granted: Capability[]
  deniedRequired: Capability[]
  deniedOptional: Capability[]
  allowed: boolean
}
