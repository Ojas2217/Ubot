import pandas as pd
import torch
from torch.utils.data import Dataset
from sklearn.preprocessing import StandardScaler

class UberDataset(Dataset):
    
    def __init__(self, file_name):
        self.data = pd.read_csv(file_name)


        self.X = torch.tensor(self.data.values)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        return self.X[index]
    

