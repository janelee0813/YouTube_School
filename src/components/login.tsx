'use client';
import {useRouter,useSearchParams} from 'next/navigation';
import {ArrowUpRight,UserRound,BookOpen,Settings2,ShieldCheck} from 'lucide-react';
import {useData} from './provider';
import {PageHead,NoticeBox} from './ui';
import {seed} from '@/lib/seed';
import {safeNext} from '@/lib/validation';
export function Login(){const {choose}=useData();const params=useSearchParams(),router=useRouter();const next=safeNext(params.get('next'));
 return <div className="container login-wrap"><PageHead eyebrow="EXPLORE THE DEMO" title="우리의 수업 공간을 미리 만나보세요.">역할을 선택해 화면과 기능을 체험할 수 있어요.</PageHead><NoticeBox>실제 인증이 없는 공개 데모입니다. 모든 데모 역할의 데이터는 이 브라우저에 저장되며 역할을 바꾸면 확인할 수 있습니다. 개인정보나 실제 수강생의 고민을 입력하지 마세요.</NoticeBox><div className="demo-roles">{seed().profiles.map((p,i)=>{const Icon=[UserRound,UserRound,BookOpen,Settings2][i];return <button className="role-card" key={p.id} onClick={()=>{choose(p.id);router.push(params.get('next')?next:p.role==='admin'?'/admin':p.role==='instructor'?'/instructor':'/records');}}><Icon size={25}/><strong>{p.name}</strong><span>{p.role==='admin'?'수업·자료 게시, 회원 승인':p.role==='instructor'?'담당 수업 질문 확인과 답변':'질문 작성, 자료 확인, 내 기록'}</span><ArrowUpRight size={18}/></button>;})}</div><p className="login-bottom"><ShieldCheck size={16}/>데모 데이터는 다른 기기와 동기화되지 않습니다. 실제 로그인은 추후 연결됩니다.</p></div>;
}
