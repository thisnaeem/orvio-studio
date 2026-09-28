import {Component,type ReactNode} from 'react';
export class PageBoundary extends Component<{children:ReactNode;onHome?:()=>void},{error:string}>{
 state={error:''};
 static getDerivedStateFromError(error:unknown){return {error:error instanceof Error?error.message:'This page could not load.'}}
 componentDidCatch(error:Error){console.error('Orvio page failed',error)}
 render(){return this.state.error?<section className="panel" role="alert" style={{padding:32}}><h2>This page needs to restart</h2><p>{this.state.error}</p><button onClick={()=>this.setState({error:''})}>Try again</button>{this.props.onHome&&<button onClick={this.props.onHome}>Go to Home</button>}<button onClick={()=>location.reload()}>Reload workspace</button></section>:this.props.children}
}
