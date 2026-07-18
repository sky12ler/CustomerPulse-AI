import type { Customer, Risk, Tier } from "./types";

export interface TierInputs { recency:number; frequency:number; monetary:number; lifetimeValue:number; diversity:number; relationship:number }
export interface ChurnInputs { recencyDeterioration:number; frequencyDeterioration:number; monetaryDeterioration:number; engagementDecline:number; unresolvedComplaints:number; negativeSentiment:number; competitorMentions:number; cancellationLanguage:number; missedCommitments:number }

const clamp = (n:number) => Math.max(0, Math.min(100, Math.round(n)));
export function calculateTier(i:TierInputs): {score:number;tier:Tier;components:TierInputs;version:string} {
  const score=clamp(i.recency*.2+i.frequency*.2+i.monetary*.2+i.lifetimeValue*.18+i.diversity*.12+i.relationship*.1);
  const tier:Tier=score>=78?"Strategic":score>=58?"Core":score>=38?"Growth":"Standard";
  return {score,tier,components:i,version:"tier-v1.0"};
}
export function riskLevel(score:number,b={low:29,medium:59,high:79}):Risk { return score<=b.low?"Low":score<=b.medium?"Medium":score<=b.high?"High":"Critical" }
export function calculateChurn(i:ChurnInputs, revenue:number) {
  const weights:Record<keyof ChurnInputs,number>={recencyDeterioration:.13,frequencyDeterioration:.16,monetaryDeterioration:.12,engagementDecline:.08,unresolvedComplaints:.16,negativeSentiment:.1,competitorMentions:.07,cancellationLanguage:.1,missedCommitments:.08};
  const score=clamp((Object.keys(weights) as (keyof ChurnInputs)[]).reduce((s,k)=>s+i[k]*weights[k],0));
  const factors=(Object.keys(weights) as (keyof ChurnInputs)[]).map(k=>({factor:k,impact:Math.round(i[k]*weights[k])})).sort((a,b)=>b.impact-a.impact);
  return {score,level:riskLevel(score),confidence:Math.min(96,60+factors.filter(x=>x.impact>4).length*5),components:i,topFactors:factors.slice(0,4),revenueAtRisk:Math.round(revenue*score/100),deadlineHours:score>=80?24:score>=60?48:120,version:"churn-v1.0"};
}
export function validateEvidence(messageIds:string[], citedIds:string[]){ const valid=new Set(messageIds); return citedIds.every(id=>valid.has(id)) && new Set(citedIds).size===citedIds.length }
export function canOutreach(customer:Pick<Customer,"consent"|"phone"|"email">,channel:string){ return customer.consent && (channel==="WhatsApp"?Boolean(customer.phone):Boolean(customer.email)) }
export function whatsappLink(phone:string,text:string){ return `https://wa.me/${phone.replace(/\D/g,"")}?text=${encodeURIComponent(text)}` }
export function detectPromptInjection(text:string){ return /ignore (all|previous)|system prompt|developer message|tool behaviour|act as/i.test(text) }
export function detectSegmentDecline(affected:number,total:number,revenueDecline:number,frequencyDecline:number,engagementDecline:number){ const pct=total?affected/total*100:0; return {triggered:pct>=20||revenueDecline>=15||frequencyDecline>=20||engagementDecline>=25,affectedPercentage:Math.round(pct),reasons:[pct>=20&&"Risk concentration",revenueDecline>=15&&"Revenue decline",frequencyDecline>=20&&"Purchase frequency decline",engagementDecline>=25&&"Engagement decline"].filter(Boolean)} }
