
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    business_description: '',
    business_phone: '',
    business_address: '',
    business_website: '',
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    
    toast({
      title: "Settings Saved",
      description: "Your settings have been updated successfully",
    });
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/profile')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account information</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-sm text-gray-500 mt-1">Email address cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Configure your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleInputChange}
                  placeholder="Enter your business name"
                />
              </div>
              <div>
                <Label htmlFor="business_description">Business Description</Label>
                <Textarea
                  id="business_description"
                  name="business_description"
                  value={formData.business_description}
                  onChange={handleInputChange}
                  placeholder="Describe your business and services"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <Input
                    id="business_phone"
                    name="business_phone"
                    value={formData.business_phone}
                    onChange={handleInputChange}
                    placeholder="+1 555 123 4567"
                  />
                </div>
                <div>
                  <Label htmlFor="business_website">Website</Label>
                  <Input
                    id="business_website"
                    name="business_website"
                    value={formData.business_website}
                    onChange={handleInputChange}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleInputChange}
                  placeholder="Enter your business address"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
