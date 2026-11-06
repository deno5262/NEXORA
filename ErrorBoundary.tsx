import { Component, ReactNode } from 'react'
export default class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    return this.state.err ? <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="mb-2 text-xl font-bold">Something went wrong</h1><p className="mb-4 text-mute">{this.state.err.message}</p><button className="btn" onClick={() => location.reload()}>Reload</button></div></div> : this.props.children
  }
}
