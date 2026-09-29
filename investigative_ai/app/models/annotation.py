from typing import Annotated, Any
from bson import ObjectId
from pydantic import BeforeValidator, WithJsonSchema

def validate_object_id(v: Any) -> ObjectId:
    if isinstance(v, ObjectId):
        return v
    if ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId format")

# Reusable custom type for Pydantic v2 and FastAPI
PyObjectId = Annotated[
    ObjectId,
    BeforeValidator(validate_object_id),
    WithJsonSchema({"type": "string"}),
]