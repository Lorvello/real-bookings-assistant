
import React, { useState } from 'react';
import { Calendar, BarChart3, MessageSquare, Bell, Globe, Zap, Settings, TrendingUp } from 'lucide-react';
import { TranslationDemo } from './TranslationDemo';

const Features = () => {
  const [selectedPersonality, setSelectedPersonality] = useState('professional');
  const [responseSpeed, setResponseSpeed] = useState(85);
  const [creativityLevel, setCreativityLevel] = useState(70);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [phoneRotation, setPhoneRotation] = useState(0);
  const [showNotification, setShowNotification] = useState(false);

  const personalities = [
    { id: 'professional', label: 'Professional', active: selectedPersonality === 'professional' },
    { id: 'friendly', label: 'Friendly', active: selectedPersonality === 'friendly' },
    { id: 'casual', label: 'Casual', active: selectedPersonality === 'casual' }
  ];

  const smartFeatures = [
    { icon: '🎯', label: 'Context Aware', description: 'Remembers conversation history' },
    { icon: '🧠', label: 'Intent Recognition', description: 'Understands customer needs' },
    { icon: '📚', label: 'Learning System', description: 'Improves over time' },
    { icon: '🔄', label: 'Auto Routing', description: 'Connects to right person' }
  ];

  const analyticsData = [
    { label: 'Response Time', value: '< 2 sec', change: '+15%', color: 'text-emerald-400' },
    { label: 'Conversion Rate', value: '94%', change: '+23%', color: 'text-blue-400' },
    { label: 'Customer Satisfaction', value: '4.9/5', change: '+12%', color: 'text-purple-400' },
    { label: 'Bookings Today', value: '47', change: '+8%', color: 'text-orange-400' }
  ];

  const handlePhoneClick = () => {
    setPhoneRotation(prev => prev + 90);
  };

  const handleNotificationHover = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Automate Your Bookings
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our AI assistant handles customer inquiries, schedules appointments, and manages your calendar 24/7
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[800px]">
          
          {/* Own Calendar - Large Card */}
          <div className="lg:col-span-2 lg:row-span-2 bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-8 text-white relative overflow-hidden">
            <div className="relative z-10">
              <Calendar className="h-12 w-12 mb-4 text-blue-200" />
              <h3 className="text-2xl font-bold mb-2">Own Calendar</h3>
              <p className="text-blue-100 mb-6">
                Keep using your existing calendar. Our AI integrates seamlessly without disrupting your workflow.
              </p>
              
              {/* Calendar Preview */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">March 2024</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-center p-1 text-blue-200">{day}</div>
                  ))}
                  {Array.from({length: 35}, (_, i) => (
                    <div key={i} className="aspect-square flex items-center justify-center rounded text-xs hover:bg-white/20 transition-colors">
                      {i > 2 && i < 33 ? i - 2 : ''}
                      {i === 15 && <div className="w-1 h-1 bg-green-400 rounded-full absolute mt-3"></div>}
                      {i === 22 && <div className="w-1 h-1 bg-yellow-400 rounded-full absolute mt-3"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-40 h-40 bg-white/5 rounded-full"></div>
            <div className="absolute -left-10 -top-10 w-32 h-32 bg-white/5 rounded-full"></div>
          </div>

          {/* 100% Automatic Bookings */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
            <Zap className="h-8 w-8 mb-3 text-emerald-200" />
            <h3 className="text-lg font-bold mb-2">100% Automatic Bookings</h3>
            <p className="text-emerald-100 text-sm mb-4">
              AI handles everything from inquiry to confirmation
            </p>
            
            {/* iPhone Mockup */}
            <div 
              className="mx-auto w-20 h-36 bg-gray-900 rounded-[12px] p-1 cursor-pointer transition-transform duration-500 hover:scale-105"
              style={{ transform: `rotate(${phoneRotation}deg)` }}
              onClick={handlePhoneClick}
            >
              <div className="w-full h-full bg-white rounded-[8px] relative overflow-hidden">
                <div className="h-6 bg-gray-100 flex items-center justify-center">
                  <div className="w-8 h-1 bg-gray-400 rounded-full"></div>
                </div>
                <div className="p-2 space-y-2">
                  <div className="h-2 bg-blue-200 rounded w-3/4"></div>
                  <div className="h-2 bg-green-200 rounded w-1/2"></div>
                  <div className="h-2 bg-purple-200 rounded w-2/3"></div>
                  <div className="text-[6px] text-gray-600 mt-2">Booking confirmed!</div>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Dashboard Monitoring */}
          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white relative overflow-hidden">
            <BarChart3 className="h-8 w-8 mb-3 text-orange-200" />
            <h3 className="text-lg font-bold mb-2">Real-time Dashboard</h3>
            <p className="text-orange-100 text-sm mb-4">
              Monitor your business performance live
            </p>
            
            {/* Mini Dashboard */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-200">Today's Bookings</span>
                <span className="text-sm font-bold">24</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-200">Response Time</span>
                <span className="text-sm font-bold">1.2s</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1">
                <div className="bg-white h-1 rounded-full w-3/4 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Fully Personalized */}
          <div className="lg:col-span-2 bg-gradient-to-br from-purple-600 to-pink-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <Settings className="h-8 w-8 mb-3 text-purple-200" />
            <h3 className="text-xl font-bold mb-2">Fully Personalized</h3>
            <p className="text-purple-100 text-sm mb-4">
              Customize AI personality, responses, and behavior to match your brand
            </p>
            
            {/* Personality Toggles */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-200 mb-2">AI Personality</label>
              <div className="flex gap-2">
                {personalities.map((personality) => (
                  <button
                    key={personality.id}
                    onClick={() => setSelectedPersonality(personality.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      personality.active 
                        ? 'bg-white text-purple-600' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {personality.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-purple-200">Response Speed</span>
                  <span className="text-sm font-medium">{responseSpeed}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={responseSpeed}
                  onChange={(e) => setResponseSpeed(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-purple-200">Creativity Level</span>
                  <span className="text-sm font-medium">{creativityLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={creativityLevel}
                  onChange={(e) => setCreativityLevel(Number(e.target.value))}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>

            {/* Smart Features Grid */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {smartFeatures.map((feature, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors">
                  <div className="text-lg mb-1">{feature.icon}</div>
                  <div className="text-xs font-medium">{feature.label}</div>
                  <div className="text-xs text-purple-200">{feature.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart AI Responses */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <MessageSquare className="h-8 w-8 mb-3 text-indigo-200" />
            <h3 className="text-lg font-bold mb-2">Smart AI Responses</h3>
            <p className="text-indigo-100 text-sm mb-4">
              Advanced AI vs basic chatbots
            </p>
            
            {/* Comparison */}
            <div className="space-y-3">
              <div 
                className="bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors cursor-pointer"
                onMouseEnter={() => setHoveredFeature('context')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="text-xs font-medium mb-1">🎯 Context Awareness</div>
                <div className="text-xs text-indigo-200">
                  {hoveredFeature === 'context' ? 'Remembers previous conversations and preferences' : 'Understands conversation flow'}
                </div>
              </div>
              <div 
                className="bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors cursor-pointer"
                onMouseEnter={() => setHoveredFeature('intent')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="text-xs font-medium mb-1">🧠 Intent Recognition</div>
                <div className="text-xs text-indigo-200">
                  {hoveredFeature === 'intent' ? 'Identifies booking, cancellation, or inquiry intent' : 'Knows what customers want'}
                </div>
              </div>
              <div 
                className="bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors cursor-pointer"
                onMouseEnter={() => setHoveredFeature('learning')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <div className="text-xs font-medium mb-1">📚 Continuous Learning</div>
                <div className="text-xs text-indigo-200">
                  {hoveredFeature === 'learning' ? 'Improves responses based on interactions' : 'Gets smarter over time'}
                </div>
              </div>
            </div>
          </div>

          {/* Automatic Reminders */}
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <Bell className="h-8 w-8 mb-3 text-green-200" />
            <h3 className="text-lg font-bold mb-2">Automatic Reminders</h3>
            <p className="text-green-100 text-sm mb-4">
              WhatsApp reminders sent automatically
            </p>
            
            {/* WhatsApp Notification */}
            <div 
              className="cursor-pointer transition-transform hover:scale-105"
              onMouseEnter={handleNotificationHover}
            >
              <div className="bg-white rounded-lg p-3 text-gray-800 relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-xs font-medium">Beauty Salon</span>
                </div>
                <div className="text-xs text-gray-600">
                  Hi Sarah! Reminder: Your appointment is tomorrow at 2:00 PM. Reply CONFIRM or CANCEL.
                </div>
                <div className="text-xs text-gray-400 mt-1">2:45 PM</div>
                {showNotification && (
                  <div className="absolute -top-8 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded animate-bounce">
                    Sent automatically!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <TrendingUp className="h-8 w-8 mb-3 text-cyan-200" />
            <h3 className="text-lg font-bold mb-2">Detailed Analytics</h3>
            <p className="text-cyan-100 text-sm mb-4">
              Track performance and optimize
            </p>
            
            {/* Analytics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {analyticsData.map((metric, index) => (
                <div 
                  key={index}
                  className="bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors cursor-pointer group"
                >
                  <div className="text-xs text-cyan-200 mb-1">{metric.label}</div>
                  <div className="text-sm font-bold mb-1">{metric.value}</div>
                  <div className={`text-xs ${metric.color} group-hover:animate-pulse`}>
                    {metric.change}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-language Support */}
          <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl relative overflow-hidden">
            <Globe className="absolute top-4 left-4 h-8 w-8 text-rose-200 z-10" />
            <div className="absolute top-4 left-16 z-10">
              <h3 className="text-lg font-bold text-white mb-1">Multi-language Support</h3>
              <p className="text-rose-100 text-sm">
                Communicate in 200+ languages
              </p>
            </div>
            <TranslationDemo />
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;
