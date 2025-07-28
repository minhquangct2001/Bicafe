'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Coffee, Store, Users, TrendingUp, Clock, Award } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect đã login về dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  const goToDashboard = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto">
        <Card className="shadow-2xl border backdrop-blur-sm overflow-hidden">
          <CardHeader className="text-center pb-6 bg-primary text-primary-foreground">
            {/* Coffee Logo/Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-primary-foreground/20 backdrop-blur-sm p-4 rounded-full shadow-lg">
                <Coffee size={48} className="text-primary-foreground" />
              </div>
            </div>
            
            <CardTitle className="text-4xl font-bold mb-2">
              BiCafe
            </CardTitle>
            <CardDescription className="text-primary-foreground/80 text-lg">
              Welcome to your coffee shop management system
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Status and Time */}
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="px-4 py-2">
                <Store className="w-4 h-4 mr-2" />
                Cafe Open
              </Badge>
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                <span className="text-sm">Ready to serve</span>
              </div>
            </div>

            {/* Dashboard Button */}
            <div className="space-y-4">
              <Button 
                onClick={goToDashboard}
                className="w-full font-semibold py-6 px-8 text-lg"
                size="lg"
              >
                <Coffee className="mr-3" size={24} />
                Go to Dashboard
                <ArrowRight className="ml-3" size={20} />
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                Access your cafe management tools and analytics
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Sales Analytics
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Track your daily revenue and trends
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <Users className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Customer Management
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Manage orders and customer data
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <Coffee className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Menu & Inventory
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Update menu items and stock levels
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <Award className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Quality Control
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Maintain high standards and reviews
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Welcome Message */}
            <Card className="bg-muted/50 border">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-foreground mb-2">
                  Ready to brew success?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your complete cafe management solution awaits. Start managing orders, tracking sales, and delighting customers today.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
