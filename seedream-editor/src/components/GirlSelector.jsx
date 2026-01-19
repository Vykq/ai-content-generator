import { useEffect, useState } from 'react';
import { fetchGirls } from '../services/girlsService';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function GirlSelector({ onSelect, disabled }) {
  const [girls, setGirls] = useState([]);
  const [selectedGirlId, setSelectedGirlId] = useState('');

  useEffect(() => {
    loadGirls();
  }, []);

  const loadGirls = async () => {
    const data = await fetchGirls();
    setGirls(data);
  };

  const handleSelect = (value) => {
    setSelectedGirlId(value);
    if (value === 'none') {
      onSelect(null);
    } else {
      const girl = girls.find(g => g.id.toString() === value);
      onSelect(girl);
    }
  };

  return (
    <div>
      <Label htmlFor="girl-select">Select Girl (Optional)</Label>
      <Select value={selectedGirlId} onValueChange={handleSelect} disabled={disabled}>
        <SelectTrigger id="girl-select">
          <SelectValue placeholder="Choose a girl..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {girls.map((girl) => (
            <SelectItem key={girl.id} value={girl.id.toString()}>
              {girl.name} ({girl.handle})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
