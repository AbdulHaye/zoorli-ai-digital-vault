import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Key, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff, 
  Copy,
  Search,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AccountCredential {
  id: string;
  userId: string;
  serviceName: string;
  username: string;
  password: string; // Decrypted password from API
  website: string | null;
  notes: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function PasswordsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<AccountCredential | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCredentials, setSelectedCredentials] = useState<string[]>([]);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    serviceName: '',
    username: '',
    password: '',
    website: '',
    notes: '',
    category: '',
  });

  const [authState, setAuthState] = useState(auth.getState());

  useEffect(() => {
    const unsubscribe = auth.subscribe((newAuthState) => {
      setAuthState(newAuthState);
    });
    
    return unsubscribe;
  }, []);

  const user = authState.user;

  // Redirect unauthenticated users to home page
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      navigate('/');
    }
  }, [authState.isLoading, authState.isAuthenticated, navigate]);

  // Fetch all credentials
  const { data: credentialsData, isLoading: credentialsLoading } = useQuery({
    queryKey: ['/api/credentials'],
    enabled: !!user,
  });

  const credentials = ((credentialsData as any)?.data as AccountCredential[]) || [];

  // Filter credentials based on search query
  const filteredCredentials = credentials.filter((cred) => {
    const query = searchQuery.toLowerCase();
    return (
      cred.serviceName.toLowerCase().includes(query) ||
      cred.username.toLowerCase().includes(query) ||
      (cred.website && cred.website.toLowerCase().includes(query)) ||
      (cred.category && cred.category.toLowerCase().includes(query))
    );
  });

  // Create credential mutation
  const createCredential = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest('POST', '/api/credentials', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password saved',
        description: 'Your credential has been securely stored.',
        duration: 2300,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save credential',
        variant: 'destructive',
        duration: 2300,
      });
    },
  });

  // Update credential mutation
  const updateCredential = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<typeof formData> }) => {
      const res = await apiRequest('PUT', `/api/credentials/${data.id}`, data.updates);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password updated',
        description: 'Your credential has been updated successfully.',
        duration: 2300,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      setEditDialogOpen(false);
      setSelectedCredential(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update credential',
        variant: 'destructive',
        duration: 2300,
      });
    },
  });

  // Delete credential mutation
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/credentials/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password deleted',
        description: 'Your credential has been permanently deleted.',
        duration: 2300,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
      setDeleteDialogOpen(false);
      setSelectedCredential(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete credential',
        variant: 'destructive',
        duration: 2300,
      });
    },
  });

  const resetForm = () => {
    setFormData({
      serviceName: '',
      username: '',
      password: '',
      website: '',
      notes: '',
      category: '',
    });
  };

  const handleCreate = () => {
    createCredential.mutate(formData);
  };

  const handleEdit = (credential: AccountCredential) => {
    setSelectedCredential(credential);
    setFormData({
      serviceName: credential.serviceName,
      username: credential.username,
      password: '', // Don't pre-fill password for security
      website: credential.website || '',
      notes: credential.notes || '',
      category: credential.category || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (selectedCredential) {
      // Only include password if it was changed
      const updates: any = {
        serviceName: formData.serviceName,
        username: formData.username,
        website: formData.website || null,
        notes: formData.notes || null,
        category: formData.category || null,
      };
      
      if (formData.password) {
        updates.password = formData.password;
      }

      updateCredential.mutate({ id: selectedCredential.id, updates });
    }
  };

  const handleDelete = (credential: AccountCredential) => {
    setSelectedCredential(credential);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCredential) {
      setIsDeleting(true);
      try {
        await apiRequest('DELETE', `/api/credentials/${selectedCredential.id}`);
        toast({
          title: 'Password deleted',
          description: 'Your credential has been permanently deleted.',
          duration: 2300,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
        setDeleteDialogOpen(false);
        setSelectedCredential(null);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete credential',
          variant: 'destructive',
          duration: 2300,
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to clipboard',
        description: `${label} has been copied.`,
        duration: 2300,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
        duration: 2300,
      });
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedCredentials([]);
    }
  };

  const toggleCredentialSelection = (credentialId: string) => {
    setSelectedCredentials(prev => 
      prev.includes(credentialId) 
        ? prev.filter(id => id !== credentialId)
        : [...prev, credentialId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCredentials.length === filteredCredentials.length) {
      setSelectedCredentials([]);
    } else {
      setSelectedCredentials(filteredCredentials.map(c => c.id));
    }
  };

  const handleBatchDelete = () => {
    setBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = async () => {
    setIsDeleting(true);
    setBatchDeleteDialogOpen(false);
    
    const failedDeletions: string[] = [];
    let successCount = 0;

    for (const id of selectedCredentials) {
      try {
        await apiRequest('DELETE', `/api/credentials/${id}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete credential ${id}:`, error);
        failedDeletions.push(id);
      }
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/credentials'] });
    
    if (failedDeletions.length === 0) {
      toast({
        title: 'Passwords deleted',
        description: `${successCount} password(s) have been deleted successfully.`,
        duration: 2300,
      });
      setSelectedCredentials([]);
      setSelectionMode(false);
    } else {
      toast({
        title: 'Partial deletion',
        description: `${successCount} password(s) deleted, but ${failedDeletions.length} failed. Please try again.`,
        variant: 'destructive',
        duration: 2300,
      });
      // Keep only the failed items selected for retry
      setSelectedCredentials(failedDeletions);
    }
    
    setIsDeleting(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to access your password vault</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} data-testid="button-signin">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Full-Screen Loading Overlay */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-8 rounded-lg shadow-lg flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Deleting password(s), please wait...</p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back to Dashboard Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="page-title">
            Password Vault
          </h1>
          <p className="text-muted-foreground">
            Securely manage your account credentials with AES-256-GCM encryption
          </p>
        </div>

        {/* Search and Create */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex-1 w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search credentials..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-credential">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Credential
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Credential</DialogTitle>
                    <DialogDescription>
                      Store a new account credential securely
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="serviceName">Service Name *</Label>
                      <Input
                        id="serviceName"
                        placeholder="e.g., Gmail, Netflix"
                        value={formData.serviceName}
                        onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                        data-testid="input-service-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username/Email *</Label>
                      <Input
                        id="username"
                        placeholder="username@example.com"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        data-testid="input-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        data-testid="input-password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        placeholder="https://example.com (optional)"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        data-testid="input-website"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        placeholder="e.g., Social, Work, Finance (optional)"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        data-testid="input-category"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Additional notes (optional)"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        data-testid="input-notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreateDialogOpen(false);
                        resetForm();
                      }}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!formData.serviceName || !formData.username || !formData.password || createCredential.isPending}
                      data-testid="button-save-credential"
                    >
                      {createCredential.isPending ? 'Saving...' : 'Save Credential'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            {filteredCredentials.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={selectionMode ? "default" : "outline"}
                  size="sm"
                  onClick={toggleSelectionMode}
                  data-testid="button-select"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select
                </Button>
                {selectionMode && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      data-testid="button-select-all"
                    >
                      {selectedCredentials.length === filteredCredentials.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBatchDelete}
                      disabled={selectedCredentials.length === 0}
                      data-testid="button-delete-selected"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedCredentials.length})
                    </Button>
                  </>
                )}
                <Badge variant="secondary">{filteredCredentials.length} password{filteredCredentials.length !== 1 ? 's' : ''}</Badge>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Credentials List */}
        <div>
          {credentialsLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading credentials...</p>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Lock className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No credentials found</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  {searchQuery ? 'No credentials match your search.' : 'Start by adding your first credential to the vault.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-first-credential">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Credential
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCredentials.map((credential) => (
                <Card key={credential.id} className="hover-elevate flex flex-col" data-testid={`card-credential-${credential.id}`}>
                  <CardHeader className="space-y-3">
                    <div className="flex items-center gap-2">
                      {selectionMode && (
                        <Checkbox
                          checked={selectedCredentials.includes(credential.id)}
                          onCheckedChange={() => toggleCredentialSelection(credential.id)}
                          data-testid={`checkbox-credential-${credential.id}`}
                        />
                      )}
                      <Key className="w-4 h-4 text-primary flex-shrink-0" />
                      <CardTitle className="text-lg truncate flex-1">
                        {credential.serviceName}
                      </CardTitle>
                    </div>
                    <CardDescription className="truncate">
                      {credential.username}
                    </CardDescription>
                    {credential.category && (
                      <Badge variant="secondary" className="w-fit">{credential.category}</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 flex flex-col flex-1">
                    <div className="space-y-3 flex-1">
                      {credential.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Website:</span>
                          <a 
                            href={credential.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate"
                          >
                            {credential.website}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Input
                          type={visiblePasswords[credential.id] ? 'text' : 'password'}
                          value={visiblePasswords[credential.id] ? credential.password : '••••••••••••'}
                          readOnly
                          className="flex-1"
                          data-testid={`input-password-${credential.id}`}
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => togglePasswordVisibility(credential.id)}
                          data-testid={`button-toggle-visibility-${credential.id}`}
                        >
                          {visiblePasswords[credential.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(credential.password, 'Password')}
                          data-testid={`button-copy-${credential.id}`}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      {credential.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {credential.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(credential)}
                        data-testid={`button-edit-${credential.id}`}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(credential)}
                        data-testid={`button-delete-${credential.id}`}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Credential</DialogTitle>
            <DialogDescription>
              Update your credential information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-serviceName">Service Name</Label>
              <Input
                id="edit-serviceName"
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                data-testid="input-edit-service-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username/Email</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                data-testid="input-edit-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                data-testid="input-edit-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                placeholder="https://example.com (optional)"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                data-testid="input-edit-website"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                placeholder="e.g., Social, Work, Finance (optional)"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                data-testid="input-edit-category"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedCredential(null);
                resetForm();
              }}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.serviceName || !formData.username || updateCredential.isPending}
              data-testid="button-update-credential"
            >
              {updateCredential.isPending ? 'Updating...' : 'Update Credential'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the credential for "{selectedCredential?.serviceName}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteCredential.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Credentials?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCredentials.length} credential{selectedCredentials.length !== 1 ? 's' : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-batch-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-batch-delete"
            >
              Delete {selectedCredentials.length} Password{selectedCredentials.length !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
