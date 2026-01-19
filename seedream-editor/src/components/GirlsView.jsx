import { useState, useEffect } from 'react';
import { fetchGirls, createGirl, updateGirl, deleteGirl } from '../services/girlsService';
import { uploadFile } from '../services/falService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';

export default function GirlsView() {
  const [girls, setGirls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGirl, setEditingGirl] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    defaultPrompt: '',
    imageFile: null,
    imagePreview: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  useEffect(() => {
    loadGirls();
  }, []);

  const loadGirls = async () => {
    setIsLoading(true);
    const data = await fetchGirls();
    setGirls(data);
    setIsLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Upload image first
      if (!formData.imageFile && !editingGirl) {
        throw new Error('Please select an image');
      }

      let imageUrl = editingGirl?.image_url;

      if (formData.imageFile) {
        setUploadProgress('Uploading image...');
        imageUrl = await uploadFile(formData.imageFile);
      }

      setUploadProgress(editingGirl ? 'Updating girl...' : 'Creating girl...');

      if (editingGirl) {
        await updateGirl(editingGirl.id, formData.name, formData.handle, imageUrl, formData.defaultPrompt);
      } else {
        await createGirl(formData.name, formData.handle, imageUrl, formData.defaultPrompt);
      }

      // Reset form and reload
      setFormData({ name: '', handle: '', defaultPrompt: '', imageFile: null, imagePreview: null });
      setShowForm(false);
      setEditingGirl(null);
      await loadGirls();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleEdit = (girl) => {
    setEditingGirl(girl);
    setFormData({
      name: girl.name,
      handle: girl.handle,
      defaultPrompt: girl.default_prompt || '',
      imageFile: null,
      imagePreview: girl.image_url
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this girl?')) {
      return;
    }

    try {
      await deleteGirl(id);
      await loadGirls();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGirl(null);
    setFormData({ name: '', handle: '', defaultPrompt: '', imageFile: null, imagePreview: null });
    setError(null);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Girls Management</h1>
            <p className="text-muted-foreground">Create and manage girl profiles</p>
          </div>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>
              + Add New Girl
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{editingGirl ? 'Edit Girl' : 'Add New Girl'}</CardTitle>
              <CardDescription>Fill in the information below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="handle">Handle</Label>
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={(e) => setFormData(prev => ({ ...prev, handle: e.target.value }))}
                    placeholder="@handle"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="defaultPrompt">Default Prompt</Label>
                  <Textarea
                    id="defaultPrompt"
                    value={formData.defaultPrompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultPrompt: e.target.value }))}
                    placeholder="Enter default prompt for this girl..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <Label htmlFor="image">Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                  {formData.imagePreview && (
                    <div className="mt-4">
                      <img
                        src={formData.imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {uploadProgress && (
                  <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editingGirl ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">Loading girls...</p>
            </CardContent>
          </Card>
        ) : girls.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No girls yet. Create your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {girls.map((girl) => (
              <Card key={girl.id} className="overflow-hidden">
                <div className="aspect-square">
                  <img
                    src={girl.image_url}
                    alt={girl.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg">{girl.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{girl.handle}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(girl)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(girl.id)}
                      className="flex-1"
                    >
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
  );
}
