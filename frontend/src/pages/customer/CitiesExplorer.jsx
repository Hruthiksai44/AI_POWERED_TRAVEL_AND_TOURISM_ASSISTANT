import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiOutlineMagnifyingGlass, HiOutlineMapPin, HiOutlineArrowRight } from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { citiesAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import CityGlassVisual from '../../components/ui/CityGlassVisual';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { y: 30, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

export default function CitiesExplorer() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await citiesAPI.getAll();
        setCities(res.data || []);
      } catch {
        toast.error('Failed to load cities');
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
  }, []);

  const filtered = cities.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.state?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <Skeleton height="40px" width="300px" className="mb-4" />
          <Skeleton height="20px" width="200px" className="mb-8" />
          <Skeleton height="48px" rounded="xl" className="mb-8" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} padding="none" className="overflow-hidden border-none shadow-none bg-transparent">
              <Skeleton height="160px" rounded="2xl" className="mb-4" />
              <div className="space-y-2 px-1">
                <Skeleton height="24px" width="60%" />
                <Skeleton height="16px" width="40%" />
                <Skeleton height="16px" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-[var(--color-text-primary)] tracking-tight">
          Explore <span className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">Cities</span>
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          Discover amazing destinations across India
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <Input
          type="text"
          placeholder="Search cities by name or state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<HiOutlineMagnifyingGlass size={20} />}
          size="lg"
        />
      </motion.div>

      {/* Results Count */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-medium text-[var(--color-text-tertiary)] mb-2"
      >
        {filtered.length} {filtered.length === 1 ? 'city' : 'cities'} found
      </motion.p>

      {/* Cities Grid */}
      {filtered.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filtered.map((city, i) => (
            <motion.div
              key={city._id || city.id}
              variants={item}
              whileHover={{ y: -5 }}
            >
              <Card 
                variant="interactive" 
                padding="none" 
                onClick={() => navigate(`/cities/${city._id || city.id}`)}
                className="group flex flex-col h-full overflow-hidden"
              >
                <CityGlassVisual city={city} index={i} className="h-44" />
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] transition-colors">
                    {city.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] flex items-center gap-1.5 mt-1.5">
                    <HiOutlineMapPin className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)]" /> 
                    <span className="truncate">{city.state}</span>
                  </p>
                  <p className="text-sm text-[var(--color-text-tertiary)] mt-3 line-clamp-2 leading-relaxed">
                    {city.description}
                  </p>
                  
                  <div className="mt-auto pt-4 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] group-hover:gap-2.5 transition-all">
                    Explore <HiOutlineArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <EmptyState
            icon={<HiOutlineMapPin className="w-8 h-8" />}
            title="No cities found"
            description="Try adjusting your search term"
          />
        </motion.div>
      )}
    </div>
  );
}
