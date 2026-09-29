import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineMapPin,
  HiOutlineStar,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCamera,
  HiOutlineCake,
  HiOutlineCurrencyRupee,
  HiOutlineClock,
  HiOutlineArrowRight,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import { useCity } from '../../contexts/CityContext';
import { citiesAPI, hotelsAPI, itinerariesAPI } from '../../api/client';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

const attractionGradients = [
  'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
];

export default function CityDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectCity } = useCity();
  const [city, setCity] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cityRes = await citiesAPI.getById(id);
        const cityData = cityRes.data;
        setCity(cityData);
        selectCity(cityData);

        const [hotelsRes, itinerariesRes] = await Promise.allSettled([
          hotelsAPI.getByCity(id),
          itinerariesAPI.getByCity(id),
        ]);
        if (hotelsRes.status === 'fulfilled') setHotels(hotelsRes.value.data || []);
        if (itinerariesRes.status === 'fulfilled') setItineraries(itinerariesRes.value.data || []);
      } catch {
        toast.error('Failed to load city details');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col">
        <Skeleton height="320px" rounded="none" className="mb-10" />
        <div className="flex flex-col gap-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <Skeleton height="150px" rounded="2xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton height="200px" rounded="2xl" />
            <Skeleton height="200px" rounded="2xl" />
            <Skeleton height="200px" rounded="2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!city) {
    return (
      <div className="py-20">
        <EmptyState 
          icon={<HiOutlineMapPin className="w-12 h-12" />}
          title="City not found"
          description="We couldn't find the city you're looking for."
          action={{ label: "Go Back", onClick: () => navigate('/cities') }}
        />
      </div>
    );
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <HiOutlineStar
        key={i}
        className={`w-4 h-4 ${i < Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
      />
    ));
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-64 sm:h-80 bg-[var(--color-bg-secondary)] overflow-hidden border-b border-[var(--color-border-primary)]"
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-6xl font-black text-[var(--color-text-primary)] text-center tracking-tight"
          >
            {city.name}
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2 text-[var(--color-text-secondary)] text-lg mt-4 font-medium"
          >
            <HiOutlineMapPin className="w-5 h-5" /> {city.state}, India
          </motion.p>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
          {/* Description */}
          <motion.div variants={item}>
            <Card>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                <HiOutlineSparkles className="w-6 h-6 text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]" />
                About {city.name}
              </h2>
              <p className="text-[var(--color-text-secondary)] leading-relaxed text-lg">{city.description}</p>
            </Card>
          </motion.div>

          {/* Tourist Attractions */}
          <motion.div variants={item}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 rounded-full bg-[var(--color-brand-500)]" />
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                Tourist Attractions
              </h2>
            </div>
            {city.attractions?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {city.attractions.map((attr, i) => (
                  <motion.div key={attr._id || attr.id || i} variants={item} whileHover={{ y: -4 }}>
                    <Card className="h-full flex flex-col">
                      <div className={`w-12 h-12 rounded-xl ${attractionGradients[i % attractionGradients.length]} flex items-center justify-center mb-5 shrink-0`}>
                        <HiOutlineCamera className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-[var(--color-text-primary)] text-lg">{attr.name}</h3>
                      {attr.category && (
                        <div className="mt-2">
                          <Badge variant="info">{attr.category}</Badge>
                        </div>
                      )}
                      <p className="text-sm text-[var(--color-text-secondary)] mt-3 line-clamp-3 leading-relaxed flex-1">{attr.description}</p>
                      
                      <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)] space-y-2">
                        {attr.timing && (
                          <p className="text-sm text-[var(--color-text-tertiary)] flex items-center gap-2">
                            <HiOutlineClock className="w-4 h-4 text-[var(--color-text-secondary)]" /> {attr.timing}
                          </p>
                        )}
                        {attr.entry_fee != null && (
                          <p className="text-sm text-[var(--color-text-tertiary)] flex items-center gap-2">
                            <HiOutlineCurrencyRupee className="w-4 h-4 text-[var(--color-text-secondary)]" /> 
                            {attr.entry_fee === 0 ? 'Free Entry' : `₹${attr.entry_fee}`}
                          </p>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState title="No tourist attractions listed yet." />
            )}
          </motion.div>

          {/* Famous Foods */}
          <motion.div variants={item}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 rounded-full bg-orange-500" />
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                Famous Foods
              </h2>
            </div>
            {city.foods?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {city.foods.map((food, i) => (
                  <motion.div key={food._id || food.id || i} variants={item} whileHover={{ y: -4 }}>
                    <Card className="h-full flex flex-col">
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <h3 className="font-bold text-[var(--color-text-primary)] text-lg flex-1 leading-tight">{food.name}</h3>
                        {food.type && (
                          <Badge variant={food.type?.toLowerCase() === 'veg' ? 'success' : 'error'} className="shrink-0">
                            {food.type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed flex-1 mb-4">{food.description}</p>
                      {food.where_to_find && (
                        <div className="mt-auto pt-3 border-t border-[var(--color-border-primary)]">
                          <p className="text-sm text-[var(--color-text-tertiary)] flex items-start gap-2">
                            <HiOutlineMapPin className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)] mt-0.5" /> 
                            <span>{food.where_to_find}</span>
                          </p>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState title="No famous foods listed yet." />
            )}
          </motion.div>

          {/* Hotels */}
          <motion.div variants={item}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 rounded-full bg-blue-500" />
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                Available Hotels
              </h2>
            </div>
            {hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotels.map((hotel, i) => (
                  <motion.div
                    key={hotel._id || hotel.id}
                    variants={item}
                    whileHover={{ y: -4 }}
                  >
                    <Card 
                      variant="interactive" 
                      padding="none" 
                      onClick={() => navigate(`/hotels/${hotel._id || hotel.id}`)}
                      className="group h-full flex flex-col overflow-hidden"
                    >
                      <div className="h-32 bg-[var(--color-bg-secondary)] flex items-center justify-center border-b border-[var(--color-border-primary)] shrink-0">
                        <HiOutlineBuildingOffice2 className="w-12 h-12 text-[var(--color-text-tertiary)] opacity-50" />
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h3 className="font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] transition-colors line-clamp-1">
                          {hotel.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1.5">{renderStars(hotel.rating)}</div>
                        <p className="text-sm text-[var(--color-text-secondary)] flex items-start gap-1.5 mt-3 line-clamp-2 flex-1">
                          <HiOutlineMapPin className="w-4 h-4 shrink-0 text-[var(--color-text-tertiary)] mt-0.5" /> 
                          {hotel.address}
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)] flex items-center justify-between">
                          {hotel.room_types?.[0]?.price_per_night ? (
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm text-[var(--color-text-tertiary)]">From</span>
                              <span className="text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] font-bold">
                                ₹{hotel.room_types[0].price_per_night}
                              </span>
                              <span className="text-xs text-[var(--color-text-tertiary)]">/night</span>
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--color-text-tertiary)]">Price unavailable</span>
                          )}
                          <HiOutlineArrowRight className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] transition-colors" />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState title="No hotels available for this city yet." />
            )}
          </motion.div>

          {/* Itineraries */}
          <motion.div variants={item}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-8 rounded-full bg-emerald-500" />
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                Available Itineraries
              </h2>
            </div>
            {itineraries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {itineraries.map((itin) => (
                  <motion.div
                    key={itin._id || itin.id}
                    variants={item}
                    whileHover={{ y: -4 }}
                  >
                    <Card 
                      variant="interactive" 
                      onClick={() => navigate(`/itineraries/${itin._id || itin.id}`)}
                      className="group h-full flex flex-col"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-[var(--color-text-primary)] text-lg group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)] transition-colors">
                            {itin.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 mt-3">
                            <span className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-1.5 bg-[var(--color-bg-secondary)] px-2.5 py-1 rounded-md">
                              <HiOutlineCalendarDays className="w-4 h-4 text-[var(--color-text-tertiary)]" /> {itin.duration_days} Days
                            </span>
                            <span className="text-sm font-bold text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)] flex items-center gap-1">
                              <HiOutlineCurrencyRupee className="w-4 h-4" /> {itin.price?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[var(--color-bg-secondary)] group-hover:bg-[var(--color-brand-50)] dark:group-hover:bg-[var(--color-brand-900)/30] flex items-center justify-center shrink-0 transition-colors">
                          <HiOutlineArrowRight className="w-5 h-5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand-600)] dark:group-hover:text-[var(--color-brand-400)]" />
                        </div>
                      </div>
                      {itin.highlights?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[var(--color-border-primary)]">
                          {itin.highlights.slice(0, 3).map((h, hi) => (
                            <Badge key={hi} variant="default">{h}</Badge>
                          ))}
                          {itin.highlights.length > 3 && (
                            <Badge variant="default">+{itin.highlights.length - 3} more</Badge>
                          )}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState title="No itineraries available for this city yet." />
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Assistant Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: 'spring' }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/assistant')}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)] text-white shadow-lg shadow-brand-500/30 flex items-center justify-center py-3 px-5 font-medium flex gap-2"
      >
        <HiOutlineChatBubbleLeftRight className="w-6 h-6" />
        <span className="hidden sm:inline">Ask Assistant</span>
      </motion.button>
    </div>
  );
}
