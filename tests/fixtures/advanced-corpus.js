'use strict';
const { source } = require('./coding-corpus');
let seed = 0x5e4e2026;
function random(n) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) % n; }
const fixtures = {};

// Bellman-Ford is independent of the priority-queue implementation under test.
function graphCase(n, edges, label) {
    const d = Array(n).fill(Infinity); d[0] = 0;
    for (let k = 1; k < n; k++) {
        let changed = false;
        for (const [u,v,w] of edges) if (d[u] + w < d[v]) { d[v] = d[u] + w; changed = true; }
        if (!changed) break;
    }
    return { label, input: `${n} ${edges.length}\n` + edges.map(e => e.join(' ')).join('\n') + '\n', expected: d.map(x => x === Infinity ? '-1' : String(x)).join(' ') };
}
const graphs = [graphCase(1, [], 'single-node'), graphCase(5, [[0,1,0],[0,1,9],[1,2,4000000000],[2,3,4000000000],[0,3,9000000000]], 'zero-parallel-unreachable-64bit')];
for (let k = 0; k < 24; k++) {
    const n = 2 + random(16), edges = [];
    for (let i = 0, m = random(n*n); i < m; i++) edges.push([random(n),random(n),random(100)]);
    graphs.push(graphCase(n, edges, 'random-' + k));
}
const bigEdges = [];
for (let i=0;i<1999;i++) bigEdges.push([i,i+1,4000000]);
for (let i=0;i<8000;i++) bigEdges.push([random(2000),random(2000),random(10000000)]);
graphs.push(graphCase(2000,bigEdges,'stress-2000-nodes-9999-edges'));
const dijkstra = {
    cpp: `int n=R(),m=R();vector<vector<pair<int,long long>>>g(n);while(m--){int u=R(),v=R();long long w=R();g[u].push_back({v,w});}vector<long long>d(n,LLONG_MAX);priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<pair<long long,int>>>q;d[0]=0;q.push({0,0});while(!q.empty()){auto [du,u]=q.top();q.pop();if(du!=d[u])continue;for(auto [v,w]:g[u])if(du+w<d[v]){d[v]=du+w;q.push({d[v],v});}}for(auto x:d)cout<<(x==LLONG_MAX?-1:x)<<' ';`,
    py: `import heapq\nn=int(next(it));m=int(next(it));g=[[] for _ in range(n)]\nfor _ in range(m):\n u=int(next(it));v=int(next(it));w=int(next(it));g[u].append((v,w))\nd=[None]*n;d[0]=0;q=[(0,0)]\nwhile q:\n du,u=heapq.heappop(q)\n if du!=d[u]:continue\n for v,w in g[u]:\n  nd=du+w\n  if d[v] is None or nd<d[v]:d[v]=nd;heapq.heappush(q,(nd,v))\nprint(*(-1 if x is None else x for x in d))`,
    java: `int n=(int)R(),m=(int)R();ArrayList<long[]>[]g=new ArrayList[n];for(int i=0;i<n;i++)g[i]=new ArrayList<>();while(m-->0){int u=(int)R(),v=(int)R();long w=R();g[u].add(new long[]{v,w});}long[]d=new long[n];Arrays.fill(d,Long.MAX_VALUE);PriorityQueue<long[]>q=new PriorityQueue<>((a,b)->Long.compare(a[0],b[0]));d[0]=0;q.add(new long[]{0,0});while(!q.isEmpty()){long[]cur=q.poll();long du=cur[0];int u=(int)cur[1];if(du!=d[u])continue;for(long[]e:g[u]){int v=(int)e[0];long nd=du+e[1];if(nd<d[v]){d[v]=nd;q.add(new long[]{nd,v});}}}StringBuilder out=new StringBuilder();for(long x:d)out.append(x==Long.MAX_VALUE?-1:x).append(' ');System.out.println(out);`,
    cs: `int n=(int)R(),m=(int)R();var g=new System.Collections.Generic.List<(int,long)>[n];for(int i=0;i<n;i++)g[i]=new();while(m-->0){int u=(int)R(),v=(int)R();long w=R();g[u].Add((v,w));}long[]d=new long[n];Array.Fill(d,long.MaxValue);var q=new System.Collections.Generic.PriorityQueue<int,long>();d[0]=0;q.Enqueue(0,0);while(q.TryDequeue(out int u,out long du)){if(du!=d[u])continue;foreach(var e in g[u]){long nd=du+e.Item2;if(nd<d[e.Item1]){d[e.Item1]=nd;q.Enqueue(e.Item1,nd);}}}for(int i=0;i<n;i++)if(d[i]==long.MaxValue)d[i]=-1;Console.WriteLine(string.Join(" ",d));`
};
const cDijkstra = `#include <stdio.h>
#include <stdlib.h>
#include <limits.h>
typedef struct{int v,next;long long w;}Edge;
typedef struct{int u;long long d;}Item;
static Edge e[30000];static int head[10000],sz;static Item heap[40000];static int hs;
void push(int u,long long d){int i=++hs;while(i>1&&heap[i/2].d>d){heap[i]=heap[i/2];i/=2;}heap[i]=(Item){u,d};}
Item pop(void){Item out=heap[1],x=heap[hs--];int i=1;while(i*2<=hs){int j=i*2;if(j<hs&&heap[j+1].d<heap[j].d)j++;if(x.d<=heap[j].d)break;heap[i]=heap[j];i=j;}heap[i]=x;return out;}
int main(void){int n,m;scanf("%d%d",&n,&m);for(int i=0;i<n;i++)head[i]=-1;while(m--){int u,v;long long w;scanf("%d%d%lld",&u,&v,&w);e[sz]=(Edge){v,head[u],w};head[u]=sz++;}long long d[10000];for(int i=0;i<n;i++)d[i]=LLONG_MAX;d[0]=0;push(0,0);while(hs){Item x=pop();if(x.d!=d[x.u])continue;for(int i=head[x.u];i!=-1;i=e[i].next){int v=e[i].v;long long nd=x.d+e[i].w;if(nd<d[v]){d[v]=nd;push(v,nd);}}}for(int i=0;i<n;i++)printf("%lld ",d[i]==LLONG_MAX?-1:d[i]);return 0;}`;
fixtures.dijkstra = { cases: graphs, sources: Object.fromEntries(Object.entries(dijkstra).map(([ext,body])=>[ext,source(body,ext)])) };
fixtures.dijkstra.sources.c = cDijkstra;

// Exhaustive subsets, not another knapsack DP, provide the small-case oracle.
function knapsackCase(items, capacity, label, known) {
    let best = 0n;
    if (known !== undefined) best = BigInt(known);
    else for (let mask=0;mask<2**items.length;mask++) {
        let w=0,v=0n;
        for(let i=0;i<items.length;i++)if(mask & (1<<i)){w+=items[i][0];v+=BigInt(items[i][1]);}
        if(w<=capacity && v>best)best=v;
    }
    return { label, input:`${items.length} ${capacity}\n`+items.map(x=>x.join(' ')).join('\n')+'\n', expected:String(best) };
}
const packs=[knapsackCase([],0,'empty'),knapsackCase([[0,4000000000],[0,4000000000],[3,7]],0,'zero-weight-64bit'),knapsackCase([[2,3]],4,'reject-unbounded-reuse')];
for(let k=0;k<24;k++)packs.push(knapsackCase(Array.from({length:random(13)},()=>[random(12),random(50)]),random(40),'random-'+k));
packs.push(knapsackCase(Array.from({length:300},()=>[1,4000000000]),10000,'stress-3-million-dp-updates',1200000000000n));
const packBodies={
 c:'int n=(int)R(),cap=(int)R();long long*dp=calloc(cap+1,sizeof(long long));while(n--){int w=(int)R();long long v=R();for(int j=cap;j>=w;j--)if(dp[j-w]+v>dp[j])dp[j]=dp[j-w]+v;}printf("%lld",dp[cap]);free(dp);',
 cpp:'int n=R(),cap=R();vector<long long>dp(cap+1);while(n--){int w=R();long long v=R();for(int j=cap;j>=w;j--)dp[j]=max(dp[j],dp[j-w]+v);}cout<<dp[cap];',
 py:'n=int(next(it));cap=int(next(it));dp=[0]*(cap+1)\nfor _ in range(n):\n w=int(next(it));v=int(next(it))\n for j in range(cap,w-1,-1):dp[j]=max(dp[j],dp[j-w]+v)\nprint(dp[cap])',
 java:'int n=(int)R(),cap=(int)R();long[]dp=new long[cap+1];while(n-->0){int w=(int)R();long v=R();for(int j=cap;j>=w;j--)dp[j]=Math.max(dp[j],dp[j-w]+v);}System.out.println(dp[cap]);',
 cs:'int n=(int)R(),cap=(int)R();long[]dp=new long[cap+1];while(n-->0){int w=(int)R();long v=R();for(int j=cap;j>=w;j--)dp[j]=Math.Max(dp[j],dp[j-w]+v);}Console.WriteLine(dp[cap]);'
};
fixtures.knapsack01={cases:packs,sources:Object.fromEntries(Object.entries(packBodies).map(([ext,body])=>[ext,source(body,ext)]))};

// Direct array updates/sums are deliberately independent of lazy propagation.
function segmentCase(n, operations, label) {
    const a=Array(n).fill(0n),out=[];
    for(const [type,l,r,value]of operations) {
        if(type===1)for(let i=l;i<=r;i++)a[i]+=BigInt(value);
        else out.push(a.slice(l,r+1).reduce((s,x)=>s+x,0n).toString());
    }
    return {label,input:`${n} ${operations.length}\n`+operations.map(x=>x.join(' ')).join('\n')+'\n',expected:out.join('\n')};
}
const segments=[segmentCase(1,[[2,0,0],[1,0,0,-8],[2,0,0]],'single-negative'),segmentCase(6,[[1,0,5,4000000000],[1,2,4,-3],[2,0,5],[2,3,3],[1,0,5,7],[2,1,4]],'overlapping-lazy-64bit')];
for(let k=0;k<24;k++){
 const n=1+random(30),ops=[];
 for(let i=0;i<60;i++){let l=random(n),r=random(n);if(l>r)[l,r]=[r,l];ops.push(random(3)?[1,l,r,random(201)-100]:[2,l,r]);}
 ops.push([2,0,n-1]);segments.push(segmentCase(n,ops,'random-'+k));
}
const stressOps=[];for(let i=0;i<10000;i++){let l=random(20000),r=random(20000);if(l>r)[l,r]=[r,l];stressOps.push(i%3?[1,l,r,random(2001)-1000]:[2,l,r]);}
segments.push(segmentCase(20000,stressOps,'stress-20000-elements-10000-operations'));
const helpers=`
static void apply(int p,int l,int r,LL v){tree[p]+=v*(r-l+1);lazy[p]+=v;}
static void push(int p,int l,int r){if(lazy[p]!=0&&l!=r){int m=(l+r)/2;apply(p*2,l,m,lazy[p]);apply(p*2+1,m+1,r,lazy[p]);lazy[p]=0;}}
static void add(int p,int l,int r,int ql,int qr,LL v){if(ql<=l&&r<=qr){apply(p,l,r,v);return;}push(p,l,r);int m=(l+r)/2;if(ql<=m)add(p*2,l,m,ql,qr,v);if(qr>m)add(p*2+1,m+1,r,ql,qr,v);tree[p]=tree[p*2]+tree[p*2+1];}
static LL query(int p,int l,int r,int ql,int qr){if(ql<=l&&r<=qr)return tree[p];push(p,l,r);int m=(l+r)/2;LL ans=0;if(ql<=m)ans+=query(p*2,l,m,ql,qr);if(qr>m)ans+=query(p*2+1,m+1,r,ql,qr);return ans;}
`;
const segmentSources={};
for(const ext of ['c','cpp','java','cs']){
 const body=ext==='c'||ext==='cpp'?'int n=(int)R(),q=(int)R();while(q--){int type=(int)R(),l=(int)R(),r=(int)R();if(type==1)add(1,0,n-1,l,r,R());else PRINT;}':'int n=(int)R(),q=(int)R();while(q-->0){int type=(int)R(),l=(int)R(),r=(int)R();if(type==1)add(1,0,n-1,l,r,R());else PRINT;}';
 const print={c:'printf("%lld\\n",query(1,0,n-1,l,r))',cpp:'cout<<query(1,0,n-1,l,r)<<"\\n"',java:'System.out.println(query(1,0,n-1,l,r))',cs:'Console.WriteLine(query(1,0,n-1,l,r))'}[ext];
 let code=source(body.replace('PRINT',print),ext);
 const globals=ext==='c'||ext==='cpp'?'static long long tree[80005],lazy[80005];':'static long[]tree=new long[80005],lazy=new long[80005];';
 const functions=helpers.replaceAll('LL',ext==='c'||ext==='cpp'?'long long':'long');
 code=ext==='java'?code.replace('public static void main',globals+functions+'public static void main'):ext==='cs'?code.replace('static void Main',globals+functions+'static void Main'):code.replace('int main',globals+functions+'int main');
 segmentSources[ext]=code;
}
segmentSources.py=`import sys
it=iter(map(int,sys.stdin.buffer.read().split()));n=next(it);q=next(it)
tree=[0]*(4*n+5);lazy=[0]*(4*n+5)
def apply(p,l,r,v):tree[p]+=v*(r-l+1);lazy[p]+=v
def push(p,l,r):
 if lazy[p] and l!=r:
  m=(l+r)//2;apply(p*2,l,m,lazy[p]);apply(p*2+1,m+1,r,lazy[p]);lazy[p]=0
def add(p,l,r,ql,qr,v):
 if ql<=l and r<=qr:apply(p,l,r,v);return
 push(p,l,r);m=(l+r)//2
 if ql<=m:add(p*2,l,m,ql,qr,v)
 if qr>m:add(p*2+1,m+1,r,ql,qr,v)
 tree[p]=tree[p*2]+tree[p*2+1]
def query(p,l,r,ql,qr):
 if ql<=l and r<=qr:return tree[p]
 push(p,l,r);m=(l+r)//2;ans=0
 if ql<=m:ans+=query(p*2,l,m,ql,qr)
 if qr>m:ans+=query(p*2+1,m+1,r,ql,qr)
 return ans
out=[]
for _ in range(q):
 t=next(it);l=next(it);r=next(it)
 if t==1:add(1,0,n-1,l,r,next(it))
 else:out.append(str(query(1,0,n-1,l,r)))
print('\\n'.join(out))
`;
// This template is a real Python program, so join uses one backslash in source.
segmentSources.py=segmentSources.py.replace("'\\\\n'", "'\\n'");
fixtures.lazySegmentTree={cases:segments,sources:segmentSources};

// Enumerate every s-t cut for small graphs rather than using another flow solver.
function flowCase(n, edges, label, known) {
    let best = known === undefined ? null : BigInt(known);
    if(known === undefined)for(let mask=0;mask<2**(n-2);mask++){
        const inside = u => u===0 || (u!==n-1 && !!(mask & (1<<(u-1))));
        let total=0n;
        for(const [u,v,c]of edges)if(inside(u)&&!inside(v))total+=BigInt(c);
        if(best===null||total<best)best=total;
    }
    return {label,input:`${n} ${edges.length}\n`+edges.map(e=>e.join(' ')).join('\n')+'\n',expected:String(best)};
}
const flows=[flowCase(2,[],'no-path'),flowCase(4,[[0,1,4000000000],[0,1,4000000000],[1,3,9000000000],[0,2,0]],'parallel-zero-capacity-64bit'),flowCase(6,[[0,1,1],[0,2,1],[1,3,1],[1,4,1],[2,3,1],[3,5,1],[4,5,1]],'requires-residual-rerouting')];
for(let k=0;k<24;k++){
    const n=2+random(8),edges=[];
    for(let i=0,m=random(n*n);i<m;i++){const u=random(n),v=random(n);if(u!==v)edges.push([u,v,random(100)]);}
    flows.push(flowCase(n,edges,'random-'+k));
}
const flowStress=[];for(let i=1;i<=100;i++)flowStress.push([0,i,4000000000+i],[i,101,3000000000+i]);
flows.push(flowCase(102,flowStress,'stress-100-parallel-paths-64bit',300000005050n));
const flowHelpers=`
static int bfs(){for(int i=0;i<N;i++)level[i]=-1;int h=0,t=0;queue[t++]=0;level[0]=0;while(h<t){int u=queue[h++];for(int v=0;v<N;v++)if(level[v]<0&&cap[u*N+v]>0){level[v]=level[u]+1;queue[t++]=v;}}return level[N-1]>=0?1:0;}
static LL dfs(int u,LL limit){if(u==N-1)return limit;for(;next[u]<N;next[u]++){int v=next[u];LL c=cap[u*N+v];if(c>0&&level[v]==level[u]+1){LL sent=dfs(v,limit<c?limit:c);if(sent>0){cap[u*N+v]-=sent;cap[v*N+u]+=sent;return sent;}}}return 0;}
`;
const flowSources={};
for(const ext of ['c','cpp','java','cs']){
    const ll=ext==='c'||ext==='cpp'?'long long':'long',literal=ext==='c'||ext==='cpp'?'4000000000000000LL':'4000000000000000L';
    const globals=ext==='c'||ext==='cpp'?'static long long cap[40000];static int level[200],next[200],queue[200],N;':'static long[]cap=new long[40000];static int[]level=new int[200],next=new int[200],queue=new int[200];static int N;';
    const print={c:'printf("%lld",total)',cpp:'cout<<total',java:'System.out.println(total)',cs:'Console.WriteLine(total)'}[ext];
    const body=`N=(int)R();int m=(int)R();for(int i=0;i<m;i++){int u=(int)R(),v=(int)R();${ll} w=R();cap[u*N+v]+=w;}${ll} total=0,sent;while(bfs()!=0){for(int i=0;i<N;i++)next[i]=0;while((sent=dfs(0,${literal}))>0)total+=sent;}${print};`;
    let code=source(body,ext),declarations=globals+flowHelpers.replaceAll('LL',ll);
    code=ext==='java'?code.replace('public static void main',declarations+'public static void main'):ext==='cs'?code.replace('static void Main',declarations+'static void Main'):code.replace('int main',declarations+'int main');
    flowSources[ext]=ext==='cpp'?code.replace(/\bqueue\b/g,'bfsQueue').replace(/\bnext\b/g,'edgeCursor'):code;
}
flowSources.py=`import sys
from collections import deque
it=iter(map(int,sys.stdin.buffer.read().split()));N=next(it);m=next(it);cap=[[0]*N for _ in range(N)]
for _ in range(m):
 u=next(it);v=next(it);w=next(it);cap[u][v]+=w
def bfs():
 global level
 level=[-1]*N;level[0]=0;q=deque([0])
 while q:
  u=q.popleft()
  for v in range(N):
   if level[v]<0 and cap[u][v]>0:level[v]=level[u]+1;q.append(v)
 return level[-1]>=0
def dfs(u,limit):
 if u==N-1:return limit
 while current[u]<N:
  v=current[u]
  if cap[u][v]>0 and level[v]==level[u]+1:
   sent=dfs(v,min(limit,cap[u][v]))
   if sent:cap[u][v]-=sent;cap[v][u]+=sent;return sent
  current[u]+=1
 return 0
total=0
while bfs():
 current=[0]*N
 while True:
  sent=dfs(0,4000000000000000)
  if not sent:break
  total+=sent
print(total)
`;
fixtures.dinicMaxFlow={cases:flows,sources:flowSources};

module.exports={fixtures,seed:'0x5e4e2026'};
