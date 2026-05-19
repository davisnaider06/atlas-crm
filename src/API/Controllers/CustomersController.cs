using AtlasCRM.Application.Common.Interfaces;
using AtlasCRM.Application.Common.Pagination;
using AtlasCRM.Application.Contracts.Customers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AtlasCRM.API.Controllers;

[ApiController]
[Authorize]
[Route("clientes")]
public sealed class CustomersController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public CustomersController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CustomerDto>>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken cancellationToken = default)
    {
        return Ok(await _customerService.GetPagedAsync(page, Math.Clamp(pageSize, 1, 100), search, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CustomerDto>> Post([FromBody] CreateCustomerRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _customerService.CreateAsync(request, cancellationToken));
    }

    [HttpPost("converter-lead/{leadId:long}")]
    public async Task<ActionResult<CustomerDto>> ConvertLead(long leadId, CancellationToken cancellationToken)
    {
        return Ok(await _customerService.ConvertLeadAsync(leadId, cancellationToken));
    }

    [HttpPut("{id:long}")]
    public async Task<ActionResult<CustomerDto>> Put(long id, [FromBody] UpdateCustomerRequest request, CancellationToken cancellationToken)
    {
        return Ok(await _customerService.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        await _customerService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
