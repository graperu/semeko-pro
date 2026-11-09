'use strict';

const solutions = {
    sum: {
        c: 'int n=(int)R();long long s=0;while(n--)s+=R();printf("%lld\\n",s);',
        cpp: 'int n=R();long long s=0;while(n--)s+=R();cout<<s<<"\\n";',
        py: 'n=int(next(it)); print(sum(int(next(it)) for _ in range(n)))',
        java: 'int n=(int)R();long s=0;while(n-->0)s+=R();System.out.println(s);',
        cs: 'int n=(int)R();long s=0;while(n-->0)s+=R();Console.WriteLine(s);'
    },
    sort: {
        c: 'int n=(int)R();long long a[100005];int i,j;for(i=0;i<n;i++)a[i]=R();for(i=1;i<n;i++){long long x=a[i];j=i;while(j>0&&a[j-1]>x){a[j]=a[j-1];j--;}a[j]=x;}for(i=0;i<n;i++)printf("%lld ",a[i]);',
        cpp: 'int n=R();vector<long long>a(n);for(auto &x:a)x=R();sort(a.begin(),a.end());for(auto x:a)cout<<x<<" ";',
        py: 'n=int(next(it)); print(*sorted(int(next(it)) for _ in range(n)))',
        java: 'int n=(int)R();long[]a=new long[n];for(int i=0;i<n;i++)a[i]=R();Arrays.sort(a);for(long x:a)System.out.print(x+" ");',
        cs: 'int n=(int)R();long[]a=new long[n];for(int i=0;i<n;i++)a[i]=R();Array.Sort(a);Console.WriteLine(string.Join(" ",a));'
    },
    gcd: {
        c: 'long long a=llabs(R()),b=llabs(R());while(b){long long t=a%b;a=b;b=t;}printf("%lld",a);',
        cpp: 'long long a=llabs(R()),b=llabs(R());while(b){auto t=a%b;a=b;b=t;}cout<<a;',
        py: 'import math\nprint(math.gcd(int(next(it)),int(next(it))))',
        java: 'long a=Math.abs(R()),b=Math.abs(R());while(b!=0){long t=a%b;a=b;b=t;}System.out.println(a);',
        cs: 'long a=Math.Abs(R()),b=Math.Abs(R());while(b!=0){long t=a%b;a=b;b=t;}Console.WriteLine(a);'
    },
    maxSubarray: {
        c: 'int n=(int)R(),i;long long best=0,cur=0;for(i=0;i<n;i++){long long x=R();cur=i==0?x:(x>cur+x?x:cur+x);if(i==0||cur>best)best=cur;}printf("%lld",best);',
        cpp: 'int n=R();long long best=0,cur=0;for(int i=0;i<n;i++){long long x=R();cur=i?max(x,cur+x):x;if(!i||cur>best)best=cur;}cout<<best;',
        py: 'n=int(next(it));a=[int(next(it)) for _ in range(n)];cur=best=a[0] if a else 0\nfor x in a[1:]:\n cur=max(x,cur+x);best=max(best,cur)\nprint(best)',
        java: 'int n=(int)R();long best=0,cur=0;for(int i=0;i<n;i++){long x=R();cur=i==0?x:Math.max(x,cur+x);if(i==0||cur>best)best=cur;}System.out.println(best);',
        cs: 'int n=(int)R();long best=0,cur=0;for(int i=0;i<n;i++){long x=R();cur=i==0?x:Math.Max(x,cur+x);if(i==0||cur>best)best=cur;}Console.WriteLine(best);'
    },
    lowerBound: {
        c: 'int n=(int)R(),i,l=0,r=n;long long target=R(),a[100005];for(i=0;i<n;i++)a[i]=R();while(l<r){int m=(l+r)/2;if(a[m]<target)l=m+1;else r=m;}printf("%d",l<n&&a[l]==target?l:-1);',
        cpp: 'int n=R();long long t=R();vector<long long>a(n);for(auto&x:a)x=R();int i=lower_bound(a.begin(),a.end(),t)-a.begin();cout<<(i<n&&a[i]==t?i:-1);',
        py: 'import bisect\nn=int(next(it));t=int(next(it));a=[int(next(it)) for _ in range(n)];i=bisect.bisect_left(a,t);print(i if i<n and a[i]==t else -1)',
        java: 'int n=(int)R();long t=R();long[]a=new long[n];for(int i=0;i<n;i++)a[i]=R();int l=0,r=n;while(l<r){int m=(l+r)/2;if(a[m]<t)l=m+1;else r=m;}System.out.println(l<n&&a[l]==t?l:-1);',
        cs: 'int n=(int)R();long t=R();long[]a=new long[n];for(int i=0;i<n;i++)a[i]=R();int l=0,r=n;while(l<r){int m=(l+r)/2;if(a[m]<t)l=m+1;else r=m;}Console.WriteLine(l<n&&a[l]==t?l:-1);'
    },
    factorialMod: {
        c: 'long long n=R(),v=1,i;for(i=2;i<=n;i++)v=v*i%1000000007;printf("%lld",v);',
        cpp: 'long long n=R(),v=1;for(long long i=2;i<=n;i++)v=v*i%1000000007;cout<<v;',
        py: 'n=int(next(it));v=1\nfor i in range(2,n+1):v=v*i%1000000007\nprint(v)',
        java: 'long n=R(),v=1;for(long i=2;i<=n;i++)v=v*i%1000000007;System.out.println(v);',
        cs: 'long n=R(),v=1;for(long i=2;i<=n;i++)v=v*i%1000000007;Console.WriteLine(v);'
    }
};
function source(body, ext) {
    return {
        c: '#include <stdio.h>\n#include <stdlib.h>\nlong long R(void){long long x=0;scanf("%lld",&x);return x;}\nint main(void){'+body+'return 0;}\n',
        cpp: '#include <bits/stdc++.h>\nusing namespace std;long long R(){long long x;cin>>x;return x;}\nint main(){'+body+'}\n',
        py: 'import sys\nit=iter(sys.stdin.read().split())\n'+body+'\n',
        java: 'import java.util.*;public class Main{static Scanner sc=new Scanner(System.in);static long R(){return sc.nextLong();}public static void main(String[]args){'+body+'}}\n',
        cs: 'using System;class Program{static string[]tokens=Console.In.ReadToEnd().Split((char[])null,StringSplitOptions.RemoveEmptyEntries);static int p=0;static long R(){return long.Parse(tokens[p++]);}static void Main(){'+body+'}}\n'
    }[ext];
}
const arrays=[[],[7],[3,-2,0,8,-9],[-5,-1,-7],[4000000000,4000000000,-1],[2,2,2,-1]];
const inputArray=a=>a.length+'\n'+a.join(' ')+'\n';
const cases={
    sum:arrays.map(a=>[inputArray(a),a.reduce((s,x)=>s+BigInt(x),0n).toString()]),
    sort:arrays.map(a=>[inputArray(a),[...a].sort((a,b)=>a-b).join(' ')]),
    gcd:[[0,0],[0,45],[48,18],[-42,56],[1000000007,1000000009]].map(([a,b])=>{let x=BigInt(Math.abs(a)),y=BigInt(Math.abs(b));while(y)[x,y]=[y,x%y];return[a+' '+b+'\n',x.toString()];}),
    maxSubarray:arrays.map(a=>{let best=null;for(let i=0;i<a.length;i++){let s=0n;for(let j=i;j<a.length;j++){s+=BigInt(a[j]);if(best===null||s>best)best=s;}}return[inputArray(a),String(best??0n)];}),
    lowerBound:[[[],4],[[1],1],[[1,2,2,2,9],2],[[-3,0,7],6],[[1,2,3],9]].map(([a,t])=>[a.length+' '+t+'\n'+a.join(' ')+'\n',String(a.indexOf(t))]),
    factorialMod:[0,1,10,50,10000].map(n=>{let v=1n;for(let i=2n;i<=BigInt(n);i++)v=v*i%1000000007n;return[n+'\n',v.toString()];})
};
const large=Array.from({length:50000},(_,i)=>i%101-50);cases.sum.push([inputArray(large),String(large.reduce((s,x)=>s+BigInt(x),0n))]);
module.exports={solutions,source,cases};
