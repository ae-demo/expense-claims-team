// Relative-URI next/previous links for a collection GET's envelope.
function paginationLinks(string path, int 'limit, int offset, int count) returns [string?, string?] {
    string? next = ();
    if offset + 'limit < count {
        next = path + "?limit=" + 'limit.toString() + "&offset=" + (offset + 'limit).toString();
    }
    string? previous = ();
    if offset > 0 {
        int prevOffset = offset - 'limit;
        if prevOffset < 0 {
            prevOffset = 0;
        }
        previous = path + "?limit=" + 'limit.toString() + "&offset=" + prevOffset.toString();
    }
    return [next, previous];
}
