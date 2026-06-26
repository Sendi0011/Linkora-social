import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PoolCard from '@/components/PoolCard';
import { fetchPools } from '@/lib/api';

const PoolsPage = () => {
  const [pools, setPools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPools();
        setPools(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading pools…</div>;

  return (
    <section className="p-8 bg-gradient-to-b from-neutral-900 to-neutral-800 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-6">Community Pools</h1>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {pools.map(pool => (
          <Link key={pool.id} href={`/pools/${pool.id}`} legacyBehavior>
            <a>
              <PoolCard
                poolId={pool.id}
                token={pool.token}
                balance={pool.balance}
                adminCount={pool.adminCount}
                threshold={pool.threshold}
              />
            </a>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default PoolsPage;
