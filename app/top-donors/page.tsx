// app/overlay/top-donors/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Donation = {
  id: string;
  donor_name: string;
  amount: number;
  message: string;
};

export default function TopDonorsOverlay() {
  const [leaderboard, setLeaderboard] = useState<Donation[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('donations')
        .select('*')
        .order('amount', { ascending: false })
        .limit(5); // Increased limit to 5 since the box is bigger
      
      if (data) setLeaderboard(data);
    };
    fetchLeaderboard();

    const channel = supabase
      .channel('public:donations_top')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        () => {
          // Re-fetch the leaderboard when a new donation happens
          fetchLeaderboard(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center overflow-hidden font-sans text-white">
      
      <div className="bg-zinc-900/95 p-12 rounded-[2rem] w-[800px] border-4 border-zinc-700 shadow-2xl">
        <h2 className="text-5xl font-black border-b-4 border-zinc-600 pb-6 mb-8 uppercase tracking-widest text-center text-zinc-300 drop-shadow-md">
          Top Supporters
        </h2>
        <ul className="space-y-6">
          {leaderboard.map((donor, index) => (
            <li key={donor.id} className="flex justify-between items-center text-4xl bg-zinc-800/50 p-6 rounded-2xl">
              <span className="truncate pr-6 font-bold">
                <span className="text-zinc-400 mr-2">#{index + 1}</span> {donor.donor_name}
              </span>
              <span className="text-green-400 font-black tracking-wider">${donor.amount}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}