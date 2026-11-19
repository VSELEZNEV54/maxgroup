from django.http import FileResponse, Http404

from backend.website.markup import release_file


def inventory(request, country, model):
    file = release_file(f"/model-inventory/{country}/{model}.json")
    if not file.is_file():
        raise Http404
    response = FileResponse(file.open("rb"), content_type="application/json")
    response["Cache-Control"] = "no-cache"
    return response
