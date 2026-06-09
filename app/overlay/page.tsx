// app/overlay/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Use the anonymous key for the frontend listener
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

export default function StreamOverlay() {
  const [latestAlert, setLatestAlert] = useState<Donation | null>(null);
  const [leaderboard, setLeaderboard] = useState<Donation[]>([]);

  useEffect(() => {
    // 1. Fetch the initial leaderboard on mount
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('donations')
        .select('*')
        .order('amount', { ascending: false })
        .limit(3);
      
      if (data) setLeaderboard(data);
    };
    fetchLeaderboard();

    // 2. Subscribe to real-time inserts
    const channel = supabase
      .channel('public:donations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'donations' },
        (payload) => {
          const newDonation = payload.new as Donation;
          
          // Trigger the popup animation
          setLatestAlert(newDonation);
          
          // Clear the popup after 6 seconds
          setTimeout(() => setLatestAlert(null), 6000);

          // Re-fetch or recalculate the leaderboard to include the new donation
          fetchLeaderboard(); 
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative font-sans text-white">
      
      {/* Latest Donation Alert (Centered) */}
      {latestAlert && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 animate-bounce flex flex-col items-center bg-zinc-900/80 p-6 rounded-2xl border-2 border-green-400 shadow-2xl">
          <h1 className="text-4xl font-black uppercase text-green-400 tracking-wider">
            New Donation!
          </h1>
          <p className="text-2xl mt-2">
            <span className="font-bold text-white">{latestAlert.donor_name}</span> just tipped 
            <span className="text-green-300 font-bold ml-2">${latestAlert.amount}</span>
          </p>
        </div>
      )}

      {/* Leaderboard Widget (Pinned to top right) */}
      <div className="absolute top-10 right-10 bg-zinc-900/80 p-4 rounded-xl w-64 border border-zinc-700">
        <h2 className="text-lg font-bold border-b border-zinc-600 pb-2 mb-3 uppercase tracking-wider text-zinc-300">
          Top Supporters
        </h2>
        <ul className="space-y-3">
          {leaderboard.map((donor, index) => (
            <li key={donor.id} className="flex justify-between items-center text-lg">
              <span className="truncate pr-4 font-semibold">
                {index + 1}. {donor.donor_name}
              </span>
              <span className="text-green-400 font-bold">${donor.amount}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}