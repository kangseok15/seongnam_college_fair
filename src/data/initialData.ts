import { ConsultationTimeSlot, Consultant, StudentApplicant } from '../types';

export const SEONGNAM_HIGH_SCHOOLS = [
  '분당고등학교',
  '서현고등학교',
  '낙생고등학교',
  '분당대진고등학교',
  '보평고등학교',
  '야탑고등학교',
  '늘푸른고등학교',
  '수내고등학교',
  '송림고등학교',
  '풍생고등학교',
  '태원고등학교',
  '운중고등학교',
  '판교고등학교',
  '불곡고등학교',
  '분당중앙고등학교',
  '영덕여자고등학교',
  '이우고등학교',
  '동원고등학교',
  '효성고등학교',
  '성일고등학교',
  '성남여자고등학교',
  '복정고등학교',
  '숭신여자고등학교',
  '성남고등학교',
  '계원예술고등학교',
  '성남금융고등학교',
  '성남테크노과학고등학교',
  '성남외국어고등학교',
  '성보경영고등학교',
  '풍덕고등학교'
];

export const CONSULTATION_TIMES: ConsultationTimeSlot[] = [
  { timeId: 1, timeLabel: '1타임 (09:30)', startTime: '09:30', endTime: '10:00' },
  { timeId: 2, timeLabel: '2타임 (10:00)', startTime: '10:00', endTime: '10:30' },
  { timeId: 3, timeLabel: '3타임 (10:30)', startTime: '10:30', endTime: '11:00' },
  { timeId: 4, timeLabel: '4타임 (11:00)', startTime: '11:00', endTime: '11:30' },
  { timeId: 5, timeLabel: '5타임 (11:30)', startTime: '11:30', endTime: '12:00' },
  { timeId: 6, timeLabel: '6타임 (12:30)', startTime: '12:30', endTime: '13:00' },
  { timeId: 7, timeLabel: '7타임 (13:00)', startTime: '13:00', endTime: '13:30' },
  { timeId: 8, timeLabel: '8타임 (13:30)', startTime: '13:30', endTime: '14:00' },
  { timeId: 9, timeLabel: '9타임 (14:00)', startTime: '14:00', endTime: '14:30' },
  { timeId: 10, timeLabel: '10타임 (14:30)', startTime: '14:30', endTime: '15:00' },
];

export const INITIAL_CONSULTANTS: Consultant[] = [
  { boothId: 1, name: '김민경', school: 'OO고등학교', specialty: '', contact: '010-3101-2201' },
  { boothId: 2, name: '김선우', school: 'OO고등학교', specialty: '', contact: '010-3101-2202' },
  { boothId: 3, name: '김재우', school: 'OO고등학교', specialty: '', contact: '010-3101-2203' },
  { boothId: 4, name: '김주행', school: 'OO고등학교', specialty: '', contact: '010-3101-2204' },
  { boothId: 5, name: '김준송', school: 'OO고등학교', specialty: '', contact: '010-3101-2205' },
  { boothId: 6, name: '김준우', school: 'OO고등학교', specialty: '', contact: '010-3101-2206' },
  { boothId: 7, name: '김태중', school: 'OO고등학교', specialty: '', contact: '010-3101-2207' },
  { boothId: 8, name: '문희태', school: 'OO고등학교', specialty: '', contact: '010-3101-2208' },
  { boothId: 9, name: '서기남', school: 'OO고등학교', specialty: '', contact: '010-3101-2209' },
  { boothId: 10, name: '심재권', school: 'OO고등학교', specialty: '', contact: '010-3101-2210' },
  { boothId: 11, name: '이주민', school: 'OO고등학교', specialty: '', contact: '010-3101-2211' },
  { boothId: 12, name: '임목화', school: 'OO고등학교', specialty: '', contact: '010-3101-2212' },
  { boothId: 13, name: '조만기', school: 'OO고등학교', specialty: '', contact: '010-3101-2213' },
  { boothId: 14, name: '조원배', school: 'OO고등학교', specialty: '', contact: '010-3101-2214' },
  { boothId: 15, name: '최영진', school: 'OO고등학교', specialty: '', contact: '010-3101-2215' },
  { boothId: 16, name: '홍성호', school: 'OO고등학교', specialty: '', contact: '010-3101-2216' },
  { boothId: 17, name: '황성진', school: 'OO고등학교', specialty: '', contact: '010-3101-2217' },
  { boothId: 18, name: '박동순', school: 'OO고등학교', specialty: '', contact: '010-3101-2218' },
  { boothId: 19, name: '김강석', school: 'OO고등학교', specialty: '', contact: '010-3101-2219' },
  { boothId: 20, name: '남상기', school: 'OO고등학교', specialty: '', contact: '010-3101-2220' },
  { boothId: 21, name: '박성해', school: 'OO고등학교', specialty: '', contact: '010-3101-2221' },
  { boothId: 22, name: '송제택', school: 'OO고등학교', specialty: '', contact: '010-3101-2222' },
  { boothId: 23, name: '양태모', school: 'OO고등학교', specialty: '', contact: '010-3101-2223' },
  { boothId: 24, name: '어성식', school: 'OO고등학교', specialty: '', contact: '010-3101-2224' },
  { boothId: 25, name: '임태관', school: 'OO고등학교', specialty: '', contact: '010-3101-2225' },
  { boothId: 26, name: '정광진', school: 'OO고등학교', specialty: '', contact: '010-3101-2226' },
  { boothId: 27, name: '채무철', school: 'OO고등학교', specialty: '', contact: '010-3101-2227' },
  { boothId: 28, name: '최수앙', school: 'OO고등학교', specialty: '', contact: '010-3101-2228' },
  { boothId: 29, name: '최재웅', school: 'OO고등학교', specialty: '', contact: '010-3101-2229' },
  { boothId: 30, name: '황규훈', school: 'OO고등학교', specialty: '', contact: '010-3101-2230' }
];

// Generate realistic pre-registered student applicants
export const generateInitialApplicants = (): StudentApplicant[] => {
  const applicants: StudentApplicant[] = [];
  
  // Korean student names
  const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
  const secondNames = ['민준', '서준', '도윤', '예준', '시우', '하준', '지호', '지후', '준서', '준우', '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지유', '윤서', '지민', '채원', '수아', '지아', '다은', '은우', '예린', '유진', '수현', '태민', '진우'];
  
  const majors = [
    '의예과/치의예과', '컴퓨터공학과', '경영학과', '전자전기공학부', '신소재공학과',
    '간호학과', '미디어커뮤니케이션학과', '인공지능학과', '생명공학과', '정치외교학과',
    '국어교육과', '화학공학과', '기계공학과', '경제학과', '시각디자인과'
  ];

  let idCounter = 1;

  // 1. Seed full 300 pre-registered booth slots (30 booths x 10 times)
  for (let boothId = 1; boothId <= 30; boothId++) {
    const consultant = INITIAL_CONSULTANTS.find((c) => c.boothId === boothId)!;
    const eligibleSchools = SEONGNAM_HIGH_SCHOOLS.filter((s) => s !== consultant.school);

    for (let timeId = 1; timeId <= 10; timeId++) {
      const school = eligibleSchools[(boothId * 7 + timeId * 3) % eligibleSchools.length];
      const fn = firstNames[(idCounter * 3) % firstNames.length];
      const sn = secondNames[(idCounter * 7) % secondNames.length];
      const name = `${fn}${sn}`;
      let phoneEnd = String(1000 + (idCounter * 37) % 9000);
      if ((boothId === 4 && timeId === 3) || (boothId === 8 && timeId === 3)) {
        phoneEnd = '7788';
      }
      const contact = `010-8${String(boothId).padStart(3, '0')}-${phoneEnd}`;

      let status: StudentApplicant['status'] = 'PENDING';
      let checkInAt: string | undefined = undefined;

      if (timeId === 1) {
        if (boothId === 3 || boothId === 11 || boothId === 22) {
          status = 'NO_SHOW'; // 노쇼 확정
        } else {
          status = 'CHECKED_IN'; // 출석 완료
          checkInAt = '09:45';
        }
      } else if (timeId === 2) {
        if (boothId === 7 || boothId === 18) {
          status = 'NO_SHOW'; // 노쇼 확정
        } else if (boothId <= 15) {
          status = 'CHECKED_IN'; // 출석 완료
          checkInAt = '10:35';
        } else {
          status = 'PENDING'; // 미도착(미등록)
        }
      } else if (timeId === 3) {
        if (boothId % 3 === 0) {
          status = 'CHECKED_IN'; // 출석 완료
          checkInAt = '10:48';
        } else {
          status = 'PENDING'; // 미도착(미등록)
        }
      } else {
        status = 'PENDING'; // 미도착(미등록)
      }

      const sampleTopics = [
        '내신 2.3등급 학생부종합 가천대·국민대 지원 가능선 및 생기부 세특 보완 방안 점검',
        '의약학/생명공학 계열 수능 최저학력기준 충족 전략 및 면접 대비 질문 분석',
        '정시 백분위 87% 기준 수도권 주요대 전자전기/컴공 가나다군 지원 포트폴리오 상담',
        '학생부교과 전형 내신 환산점수 유불리 분석 및 수시 6장 카드 배분 전략',
        '인공지능/SW 학종 진로활동 및 동아리 연계 탐구보고서 세특 평가 포인트 문의',
        '경영/경제학과 진학 희망, 모의고사 성적 추이에 따른 수시 납치 방지 및 정시 병행 상담',
        '일반고 블라인드 평가 대비 수상/세특 경쟁력 분석 및 추천 대학 라인 점검',
        '인문/어문계열 교차지원 유불리 및 정시 탐구 변환표준점수 영향 상담'
      ];

      applicants.push({
        id: `SN-PRE-${String(idCounter).padStart(3, '0')}`,
        name,
        studentSchool: school,
        grade: idCounter % 7 === 0 ? '고2' : idCounter % 13 === 0 ? '고1' : '고3',
        contact,
        parentContact: `010-9${String(boothId).padStart(3, '0')}-${phoneEnd}`,
        source: 'GOOGLE_FORM',
        registeredAt: '2026-10-10 14:20',
        checkInAt,
        preferredTimeId: timeId,
        targetMajor: majors[(idCounter + boothId) % majors.length],
        consultationType: idCounter % 2 === 0 ? '수시 (학생부종합/교과)' : '정시 (수능/배치표)',
        consultationTopic: sampleTopics[(idCounter + boothId * 2 + timeId) % sampleTopics.length],
        assignedBoothId: boothId,
        assignedTimeId: timeId,
        status,
        isWaitingOnSite: false
      });

      idCounter++;
    }
  }

  // 2. Generate 150 on-site waiting applicants (대기 1번 ~ 150번 실습용)
  const middleSchools = [
    '서현중학교', '내정중학교', '수내중학교', '백현중학교', '보평중학교',
    '판교중학교', '송림중학교', '이매중학교', '야탑중학교', '매송중학교',
    '삼평중학교', '구미중학교', '늘푸른중학교', '불곡중학교', '성남중학교'
  ];

  const allSchoolsPool = [...SEONGNAM_HIGH_SCHOOLS, ...middleSchools];
  const gradesPool = ['고3', '고3', '고3', '고2', '고2', '고1', 'N수생', '중3', '중3', '중2', '중1'];

  const waitingApplicants: StudentApplicant[] = [];
  for (let w = 1; w <= 150; w++) {
    const fn = firstNames[(w * 4) % firstNames.length];
    const sn = secondNames[(w * 9) % secondNames.length];
    const name = `${fn}${sn}`;
    const grade = gradesPool[(w * 3) % gradesPool.length];
    const school = allSchoolsPool[(w * 7) % allSchoolsPool.length];
    const phoneEnd = String(1000 + (w * 53) % 9000);
    const minute = String(10 + (w % 50)).padStart(2, '0');
    const hour = w <= 75 ? '10' : '11';

    waitingApplicants.push({
      id: `SN-WAIT-${String(w).padStart(3, '0')}`,
      name,
      studentSchool: school,
      grade,
      contact: `010-7${String((w % 900) + 100).padStart(3, '0')}-${phoneEnd}`,
      parentContact: `010-3${String((w % 900) + 100).padStart(3, '0')}-${phoneEnd}`,
      source: 'ON_SITE_KIOSK',
      registeredAt: `2026-10-11 ${hour}:${minute}`,
      preferredTimeId: (w % 10) + 1,
      targetMajor: majors[w % majors.length],
      consultationType: grade.startsWith('중')
        ? '고입·대입 진학설계'
        : w % 2 === 0
        ? '수시 (학생부종합/교과)'
        : '정시 (수능 전략)',
      status: 'PENDING',
      isWaitingOnSite: true,
      waitingNumber: w
    });
  }

  return [...applicants, ...waitingApplicants];
};

