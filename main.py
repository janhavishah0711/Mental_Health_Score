import joblib
from fastapi import FastAPI
from pydantic import BaseModel, Field
import pandas as pd
from typing import Literal
from fastapi.middleware.cors import CORSMiddleware


model= joblib.load('Mental_Health_Model.pkl')
top_countries = ['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France']
print("\n========== MODEL STRUCTURE ==========")
print(model)

print("\n========== MODEL STEPS ==========")
print(model.named_steps)

preprocessor = model.named_steps.get("preprocessor")

if preprocessor:
    print("\n========== PREPROCESSOR ==========")
    print(preprocessor)

    print("\n========== TRANSFORMERS ==========")

    for name, transformer, columns in preprocessor.transformers_:
        print(f"\nTransformer: {name}")
        print(f"Columns: {columns}")
        print(f"Transformer: {transformer}")

        if hasattr(transformer, "named_steps"):
            for step_name, step in transformer.named_steps.items():
                print(f"  Step: {step_name}")
                print(f"  Type: {type(step)}")

                if hasattr(step, "categories_"):
                    print("  Categories:")
                    print(step.categories_)

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class StudentData(BaseModel):
    age                       :int =Field(..., ge=10, le=100)
    gender                    :Literal['Male', 'Female']
    country                   :str
    academic_level            :Literal['Undergraduate', 'Graduate', 'High School']
    most_used_platform        :Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat', 'Twitter', 'YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp','WeChat']
    purpose_of_use            :Literal['Networking', 'Education', 'Entertainment', 'News']
    avg_daily_usage_hours     :float=Field(..., ge=6, le=24)
    daily_unlocks             :int=Field(..., ge=0)
    study_hours               :float=Field(..., ge=0, le=24)
    physical_activity_hours   :float=Field(..., ge=0, le=24)
    sleep_hours_per_night     :float=Field(..., ge=0, le=24)
    stress_level              :Literal['Low','Medium','High','Very High' ]
    

#Describe what we send app
class PredictionResponse(BaseModel):
    predicted_mental_health_score:float


@app.get('/')
def greet():
    return{' Welcome to SHeryians AI School Guys'}
top_countries=['Other', 'India', 'USA', 'Canada', 'Australia', 'UK', 'Germany', 'Turkey', 'Mexico', 'France']

@app.post('/predict', response_model=PredictionResponse)
def predict(data: StudentData):

    country_group=data.country if data.country in top_countries else "Other"

    input_row=pd.DataFrame([{
        'Age'                       :data.age, 
        'Gender'                    :data.gender,
        'Country'                   :data.country,
        'Academic_Level'            :data.academic_level,
        'Most_Used_Platform'        :data.most_used_platform,
        'Purpose_Of_Use'            :data.purpose_of_use,
        'Avg_Daily_Usage_Hours'     :data.avg_daily_usage_hours,
        'Daily_Unlocks'             :data.daily_unlocks,
        'Study_Hours'               :data.study_hours,
        'Physical_Activity_Hours'   :data.physical_activity_hours,
        'Sleep_Hours_Per_Night'     :data.sleep_hours_per_night,
        'Stress_Level'              :data.stress_level,
        'Grouped_Country'           :country_group
    }])

    prediction=model.predict(input_row)[0]
    return PredictionResponse(predicted_mental_health_score=round(float(prediction),2))